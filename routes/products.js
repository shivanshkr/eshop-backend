const { Product } = require('../models/product')
const express = require('express')
const { Category } = require('../models/category')
const router = express.Router()
const mongoose = require('mongoose')
const multer = require('multer') //for file uploading

const FILE_TYPE_MAP = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpg',
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const isValid = FILE_TYPE_MAP[file.mimetype]
    let uploadError = new Error('invalid image type')
    if (isValid) {
      uploadError = null
    }
    cb(uploadError, './public/uploads')
  },
  filename: function (req, file, cb) {
    const extension = FILE_TYPE_MAP[file.mimetype]
    const fileName = file.originalname.split(' ').join('-')
    cb(null, `${fileName}-${Date.now()}.${extension}`)
  },
})

const uploadOption = multer({ storage: storage })

router.get(`/`, async (req, res) => {
  let filter = {}
  if (req.query.categories) {
    filter = { category: req.query.categories.split(',') }
  }
  const productList = await Product.find(filter) //.select('name category id _id')
    .populate('category')

  if (!productList) {
    res.status(500).json({ success: false })
  }
  res.send(productList)
})

router.get(`/:id`, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).send('Invalid Product Id')
  }
  const productList = await Product.findById(req.params.id).populate('category')

  if (!productList) {
    res.status(500).json({ success: false })
  }
  res.send(productList)
})

router.post(`/`, uploadOption.single('image'), async (req, res) => {
  console.log(req.body)
  const category = await Category.findById(req.body.category)
  if (!category) return res.status(400).send('Invalid Category')
  const file = req.file
  if (!file) return res.status(400).send('No images uploaded')

  const fileName = req.file.filename
  const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`
  let product = new Product({
    name: req.body.name,
    description: req.body.description,
    richDescription: req.body.richDescription,
    image: `${basePath}${fileName}`,
    brand: req.body.brand,
    price: req.body.price,
    category: req.body.category,
    rating: req.body.rating,
    numReview: req.body.numReview,
    isFeatured: req.body.isFeatured,
    countInStock: req.body.countInStock,
  })

  product = await product.save()
  if (!product) {
    return res.status(500).send("The product can't be created")
  }
  return res.status(201).json(product)
})

router.put('/:id', uploadOption.single('image'), async (req, res) => {
  console.log(req.body)
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).send('Invalid Product Id')
  }
  if (!mongoose.isValidObjectId(req.body.category)) {
    res.status(400).send('Invalid Category Id')
  }
  const product = await Product.findById(req.params.id)
  if (!product) return res.status(400).send('Invalid Product')
  console.log(req.body)
  const category = await Category.findById(req.body.category)
  if (!category) return res.status(400).send('Invalid Category')

  const file = req.file
  let imagepath
  if (file) {
    const fileName = req.file.filename
    const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`
    imagepath = `${basePath}${fileName}`
  } else {
    imagepath = product.image
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    req.params.id,
    {
      name: req.body.name,
      description: req.body.description,
      richDescription: req.body.richDescription,
      image: imagepath,
      brand: req.body.brand,
      price: req.body.price,
      category: req.body.category,
      rating: req.body.rating,
      numReview: req.body.numReview,
      isFeatured: req.body.isFeatured,
      countInStock: req.body.countInStock,
    },
    { new: true }
  )

  if (!updatedProduct) {
    return res.status(500).send('the product cannot be updated')
  }
  res.status(201).send(updatedProduct)
})

router.delete('/one/:id', (req, res) => {
  Product.findByIdAndRemove(req.params.id)
    .then((product) => {
      if (product) {
        return res.status(200).json({
          success: true,
          message: 'the product is deleted',
        })
      } else {
        return res.status(404).json({
          success: false,
          message: 'product not found',
        })
      }
    })
    .catch((err) => {
      return res.status(400).json({
        success: false,
        error: err,
      })
    })
})

router.delete('/multiple', (req, res) => {
  Product.deleteMany({
    _id: {
      $in: req.body.ids,
    },
  })
    .then((product) => {
      if (product) {
        return res.status(200).json({
          success: true,
          message: 'the product is deleted',
        })
      } else {
        return res.status(404).json({
          success: false,
          message: 'product not found',
        })
      }
    })
    .catch((err) => {
      return res.status(400).json({
        success: false,
        error: err,
      })
    })
})

router.get(`/get/featured/:count`, async (req, res) => {
  const count = req.params.count ? req.params.count : 0
  const featuredProducts = await Product.find({ isFeatured: true }).limit(
    +count
  )
  if (!featuredProducts) {
    res.status(500).json({ success: false })
  }
  res.send(featuredProducts)
})

router.get(`/get/count`, async (req, res) => {
  const productCount = await Product.countDocuments()
  if (!productCount) {
    res.status(500).json({ success: false })
  }
  res.send({ productCount: productCount })
})

router.put(
  '/gallery-images/:id',
  uploadOption.array('images', 20),
  async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(400).send('Invalid Product Id')
    }
    let imagePaths = []
    const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`
    const files = req.files
    if (files) {
      files.map((file) => {
        imagePaths.push(`${basePath}${file.filename}`)
      })
    } else {
      return res.status(400).send('No images uploaded')
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        images: imagePaths,
      },
      { new: true }
    )

    if (!product) {
      return res.status(500).send('the product cannot be updated')
    }
    res.status(201).send(product)
  }
)
module.exports = router
