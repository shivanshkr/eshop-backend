const { User } = require('../models/user')
const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')

router.get(`/`, async (req, res) => {
  const userList = await User.find().select('name email phone isAdmin country')

  if (!userList) {
    res.status(500).json({ success: false })
  }
  res.send(userList)
})

router.get(`/:id`, async (req, res) => {
  const user = await User.findById(req.params.id).select('-passwordHash')
  if (!user) {
    res.status(500).json({
      success: false,
      message: 'The user with the Id is not found',
    })
  }
  res.status(200).send(user)
})

// Register user by admin
router.post('/', async (req, res) => {
  const genSalt = bcrypt.genSaltSync(12)
  let user = new User({
    name: req.body.name,
    email: req.body.email,
    passwordHash: bcrypt.hashSync(req.body.password, genSalt),
    phone: req.body.phone,
    isAdmin: req.body.isAdmin,
    street: req.body.street,
    apartment: req.body.apartment,
    zip: req.body.zip,
    city: req.body.city,
    country: req.body.country,
  })
  user = await user.save()
  // category = await Category.create(category)
  if (!user) {
    return res.status(404).send('the user cannot be created')
  }
  res.status(201).send(user)
})

router.put('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).send('Invalid User Id')
  }
  const genSalt = bcrypt.genSaltSync(12)
  const userExist = await User.findById(req.params.id)
  let newpassword
  if (req.body.password) {
    newpassword = bcrypt.hashSync(req.body.password, genSalt)
  } else {
    newpassword = userExist.passwordHash
  }
  const user = await User.findByIdAndUpdate(
    req.params.id,
    {
      name: req.body.name,
      email: req.body.email,
      passwordHash: newpassword,
      phone: req.body.phone,
      isAdmin: req.body.isAdmin,
      street: req.body.street,
      apartment: req.body.apartment,
      zip: req.body.zip,
      city: req.body.city,
      country: req.body.country,
    },
    { new: true }
  )

  if (!user) {
    return res.status(404).send('the user cannot be updated')
  }
  res.status(201).send(user)
})

router.post('/login', async (req, res) => {
  const secret = process.env.secret
  const user = await User.findOne({ email: req.body.email })
  if (!user) {
    return res.status(400).send('The User not found')
  }
  if (user && bcrypt.compareSync(req.body.password, user.passwordHash)) {
    const token = jwt.sign(
      {
        userId: user.id,
        isAdmin: user.isAdmin,
      },
      secret,
      {
        expiresIn: '1d',
      }
    )
    res.status(200).send({ user: user.email, token: token })
  } else {
    return res.status(400).send('Invalid Credential')
  }
})

// Register user
router.post('/register', async (req, res) => {
  const genSalt = bcrypt.genSaltSync(12)
  let user = new User({
    name: req.body.name,
    email: req.body.email,
    passwordHash: bcrypt.hashSync(req.body.password, genSalt),
    phone: req.body.phone,
    isAdmin: req.body.isAdmin,
    street: req.body.street,
    apartment: req.body.apartment,
    zip: req.body.zip,
    city: req.body.city,
    country: req.body.country,
  })
  user = await user.save()
  if (!user) {
    return res.status(404).send('the user cannot be created')
  }
  res.status(201).send(user)
})

// count user
router.get(`/get/count`, async (req, res) => {
  const userCount = await User.countDocuments()
  if (!userCount) {
    res.status(500).json({ success: false })
  }
  res.send({ userCount: userCount })
})

//delete user
router.delete('/:id', (req, res) => {
  User.findByIdAndRemove(req.params.id)
    .then((user) => {
      if (user) {
        return res.status(200).json({
          success: true,
          message: 'the user is deleted',
        })
      } else {
        return res.status(404).json({
          success: false,
          message: 'user not found',
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

module.exports = router
