const Cart = require("../models/Cart");
const Product = require("../models/Product");

// Get current user's cart
const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({
      user: req.user.userId,
    }).populate(
      "items.product",
      "name slug sku brand price discountPrice images stockQuantity isActive",
    );

    if (!cart) {
      cart = await Cart.create({
        user: req.user.userId,
        items: [],
      });
    }

    let subtotal = 0;

    cart.items.forEach((item) => {
      subtotal += item.unitPrice * item.quantity;
    });

    res.status(200).json({
      message: "Cart retrieved successfully",
      cart,
      subtotal,
      itemCount: cart.items.length,
    });
  } catch (error) {
    console.error("Get cart error:", error.message);

    res.status(500).json({
      message: "Server error while retrieving cart",
    });
  }
};

// Add product to cart
const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId || quantity === undefined) {
      return res.status(400).json({
        message: "Product ID and quantity are required",
      });
    }

    const requestedQuantity = Number(quantity);

    if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1) {
      return res.status(400).json({
        message: "Quantity must be a positive integer",
      });
    }

    const product = await Product.findOne({
      _id: productId,
      isActive: true,
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found or inactive",
      });
    }

    if (product.stockQuantity < requestedQuantity) {
      return res.status(400).json({
        message: "Requested quantity exceeds available stock",
        availableStock: product.stockQuantity,
      });
    }

    let cart = await Cart.findOne({
      user: req.user.userId,
    });

    if (!cart) {
      cart = new Cart({
        user: req.user.userId,
        items: [],
      });
    }

    const existingItem = cart.items.find(
      (item) => item.product.toString() === productId,
    );

    if (existingItem) {
      const newQuantity = existingItem.quantity + requestedQuantity;

      if (newQuantity > product.stockQuantity) {
        return res.status(400).json({
          message: "Requested quantity exceeds available stock",
          availableStock: product.stockQuantity,
        });
      }

      existingItem.quantity = newQuantity;
      existingItem.unitPrice =
        product.discountPrice !== null && product.discountPrice !== undefined
          ? product.discountPrice
          : product.price;
    } else {
      const currentPrice =
        product.discountPrice !== null && product.discountPrice !== undefined
          ? product.discountPrice
          : product.price;

      cart.items.push({
        product: product._id,
        quantity: requestedQuantity,
        unitPrice: currentPrice,
      });
    }

    await cart.save();

    const populatedCart = await Cart.findById(cart._id).populate(
      "items.product",
      "name slug sku brand price discountPrice images stockQuantity isActive",
    );

    let subtotal = 0;

    populatedCart.items.forEach((item) => {
      subtotal += item.unitPrice * item.quantity;
    });

    res.status(200).json({
      message: "Product added to cart successfully",
      cart: populatedCart,
      subtotal,
      itemCount: populatedCart.items.length,
    });
  } catch (error) {
    console.error("Add to cart error:", error.message);

    res.status(500).json({
      message: "Server error while adding product to cart",
    });
  }
};

// Update cart item quantity
const updateCartItem = async (req, res) => {
  try {
    const { quantity } = req.body;

    const requestedQuantity = Number(quantity);

    if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1) {
      return res.status(400).json({
        message: "Quantity must be a positive integer",
      });
    }

    const cart = await Cart.findOne({
      user: req.user.userId,
    });

    if (!cart) {
      return res.status(404).json({
        message: "Cart not found",
      });
    }

    const item = cart.items.id(req.params.itemId);

    if (!item) {
      return res.status(404).json({
        message: "Cart item not found",
      });
    }

    const product = await Product.findOne({
      _id: item.product,
      isActive: true,
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found or inactive",
      });
    }

    if (requestedQuantity > product.stockQuantity) {
      return res.status(400).json({
        message: "Requested quantity exceeds available stock",
        availableStock: product.stockQuantity,
      });
    }

    item.quantity = requestedQuantity;

    await cart.save();

    const populatedCart = await Cart.findById(cart._id).populate(
      "items.product",
      "name slug sku brand price discountPrice images stockQuantity isActive",
    );

    let subtotal = 0;

    populatedCart.items.forEach((cartItem) => {
      subtotal += cartItem.unitPrice * cartItem.quantity;
    });

    res.status(200).json({
      message: "Cart item updated successfully",
      cart: populatedCart,
      subtotal,
      itemCount: populatedCart.items.length,
    });
  } catch (error) {
    console.error("Update cart item error:", error.message);

    res.status(500).json({
      message: "Server error while updating cart item",
    });
  }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({
      user: req.user.userId,
    });

    if (!cart) {
      return res.status(404).json({
        message: "Cart not found",
      });
    }

    const item = cart.items.id(req.params.itemId);

    if (!item) {
      return res.status(404).json({
        message: "Cart item not found",
      });
    }

    item.deleteOne();

    await cart.save();

    const populatedCart = await Cart.findById(cart._id).populate(
      "items.product",
      "name slug sku brand price discountPrice images stockQuantity isActive",
    );

    let subtotal = 0;

    populatedCart.items.forEach((cartItem) => {
      subtotal += cartItem.unitPrice * cartItem.quantity;
    });

    res.status(200).json({
      message: "Product removed from cart successfully",
      cart: populatedCart,
      subtotal,
      itemCount: populatedCart.items.length,
    });
  } catch (error) {
    console.error("Remove from cart error:", error.message);

    res.status(500).json({
      message: "Server error while removing product from cart",
    });
  }
};

// Clear cart
const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({
      user: req.user.userId,
    });

    if (!cart) {
      return res.status(404).json({
        message: "Cart not found",
      });
    }

    cart.items = [];

    await cart.save();

    res.status(200).json({
      message: "Cart cleared successfully",
      cart,
      subtotal: 0,
      itemCount: 0,
    });
  } catch (error) {
    console.error("Clear cart error:", error.message);

    res.status(500).json({
      message: "Server error while clearing cart",
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
};
