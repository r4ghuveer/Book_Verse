const Product = require('../models/product');
require('dotenv').config();
const PDFDocument = require('pdfkit');
const stripe =require('stripe')(process.env.STRIPE_KEY)
const Order = require('../models/order');
const ITEMS_PER_PAGE = 1;
const fs=require('fs');
const path = require('path')
exports.getProducts = (req, res, next) => {
    const page = +req.query.page || 1;
    let totalItems;
    Product.find().count().then(numProducts=>{
        totalItems=numProducts;
        return Product.find()
        .skip((page-1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE)
    })
    .then(products => {
        res.render('shop/product-list', {
            prods: products,
            pageTitle: 'Products',
            path: '/products',
            currentPage: page,
            hasNextPage: ITEMS_PER_PAGE * page < totalItems,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage : page - 1,
            lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
            isAuthenticated: req.session.isLoggedIn
        });
    })
        .catch(err => {
            const error  = new Error(err);
            error.httpStatusCode=500;
            return next(error);
        });
};

exports.getProduct = (req, res, next) => {
    const prodId = req.params.productId;
    Product.findById(prodId)
        .then(product => {
            res.render('shop/product-detail', {
                product: product,
                pageTitle: product.title,
                path: '/products',
                isAuthenticated: req.session.isLoggedIn
            });
        })
        .catch(err => {
            const error  = new Error(err);
            error.httpStatusCode=500;
            return next(error);
        });
};

exports.getIndex = (req, res, next) => {
    const page = +req.query.page || 1;
    let totalItems;
    Product.find().count().then(numProducts=>{
        totalItems=numProducts;
        return Product.find()
        .skip((page-1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE)
    })
    .then(products => {
        res.render('shop/index', {
            prods: products,
            pageTitle: 'Shop',
            path: '/',
            currentPage: page,
            hasNextPage: ITEMS_PER_PAGE * page < totalItems,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage : page - 1,
            lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
            isAuthenticated: req.session.isLoggedIn
        });
    })
        .catch(err => {
            const error  = new Error(err);
            error.httpStatusCode=500;
            return next(error);
        });
};

exports.getCart = (req, res, next) => {
    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then(user => {
            const products = user.cart.items;
            res.render('shop/cart', {
                path: '/cart',
                pageTitle: 'Your Cart',
                products: products,
                isAuthenticated: req.session.isLoggedIn
            });
        })
        .catch(err => {
            const error  = new Error(err);
            error.httpStatusCode=500;
            return next(error);
        });
};

exports.postCart = (req, res, next) => {
    const prodId = req.body.productId;
    Product.findById(prodId)
        .then(product => {
            return req.user.addToCart(product);
        })
        .then(result => {
            console.log(result);
            res.redirect('/cart');
        });
};

exports.postCartDeleteProduct = (req, res, next) => {
    const prodId = req.body.productId;
    req.user
        .removeFromCart(prodId)
        .then(result => {
            res.redirect('/cart');
        })
        .catch(err => {
            const error  = new Error(err);
            error.httpStatusCode=500;
            return next(error);
        });
};

exports.getCheckout = (req,res,next) =>{
    console.log("what")
    let products;
    let total = 0;
    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then(user => {
            products = user.cart.items;
            total = 0;
            products.forEach(p =>{
                total += p.quantity * p.productId.price;
            })
            console.log('iam inside')
            return stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                mode: "payment",
                line_items: products.map(p=>{
                    return {
                        price_data: {
                            currency: 'inr',
                            product_data:{
                                name : p.productId.title
                            },
                            unit_amount : p.productId.price * 100
                        },
                        quantity: p.quantity
                    };
                }),
                success_url : req.protocol + '://' + req.get('host') + '/checkout/success' ,
                cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel' 
            });
        })
        .then(session =>{
            res.render('shop/checkout', {
                path: '/checkout',
                pageTitle: 'Checkout',
                products: products,
                totalSum: total, 
                isAuthenticated: req.session.isLoggedIn,
                sessionId: session.id
            });
        })
        .catch(err => {
            console.log(err)
            const error  = new Error(err);
            error.httpStatusCode=500;
            return next(error);
        });
}

exports.getCheckoutSuccess = (req, res, next) => {
    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then(user => {
            const products = user.cart.items.map(i => {
                return { quantity: i.quantity, product: { ...i.productId._doc } };
            });
            const order = new Order({
                user: {
                    email: req.user.email,
                    userId: req.user
                },
                products: products
            });
            return order.save();
        })
        .then(result => {
            return req.user.clearCart();
        })
        .then(() => {
            res.redirect('/orders');
        })
        .catch(err => {
            const error  = new Error(err);
            error.httpStatusCode=500;
            return next(error);
        });
};

exports.postOrder = (req, res, next) => {
    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then(user => {
            const products = user.cart.items.map(i => {
                return { quantity: i.quantity, product: { ...i.productId._doc } };
            });
            const order = new Order({
                user: {
                    email: req.user.email,
                    userId: req.user
                },
                products: products
            });
            return order.save();
        })
        .then(result => {
            return req.user.clearCart();
        })
        .then(() => {
            res.redirect('/orders');
        })
        .catch(err => {
            const error  = new Error(err);
            error.httpStatusCode=500;
            return next(error);
        });
};

exports.getOrders = (req, res, next) => {
    Order.find({ 'user.userId': req.user._id })
        .then(orders => {
            res.render('shop/orders', {
                path: '/orders',
                pageTitle: 'Your Orders',
                orders: orders,
                isAuthenticated: req.session.isLoggedIn
            });
        })
        .catch(err => {
            const error  = new Error(err);
            error.httpStatusCode=500;
            return next(error);
        });
};

exports.getInvoice = (req,res,next)=>{
    const orderId = req.params.orderId;
    Order.findById(orderId).then(order=>{
        if(!order){
            return next(new Error('No order found.'));
        }
        if(order.user.userId.toString()!== req.user._id.toString()){
            return next(new Error('Unauthorized'));
        }
        const invoiceName = 'invoice-'+orderId+'.pdf';
        const invoicePath = path.join('data','invoices',invoiceName);
        const pdfDoc = new PDFDocument();
        res.setHeader('Content-Type','application/pdf');
        res.setHeader('Content-Disposition','inline; filename="'+invoiceName+'"');
        pdfDoc.pipe(fs.createWriteStream(invoicePath));
        pdfDoc.pipe(res);
        pdfDoc.fontSize(30).text('Invoice',{
            underline: true
        });
        let totalPrice = 0;
        pdfDoc.text('---------------------------------------------');
        order.products.forEach(prod=>{
            totalPrice+=prod.quantity * prod.product.price;
            pdfDoc.fontSize(12).text(prod.product.title + ' - '+ prod.quantity + ' x ' + 'Rs ' + prod.product.price);
        });
        pdfDoc.text('-------------------------------------');
        pdfDoc.fontSize(20).text('Total Price : Rs ' + totalPrice); 
        pdfDoc.end();
        // fs.readFile(invoicePath,(err,data)=>{
            //     if(err){
                //         return next(err);
                //     }
            //     res.setHeader('Content-Type','application/pdf');
            //     res.setHeader('Content-Disposition','inline; filename="'+invoiceName+'"');
            //     res.send(data);
            // const file=fs.createReadStream(invoicePath);
            // file.pipe(res);
    }).catch(err=>next(err))
}
