const mongoose = require('mongoose')
const Schema = mongoose.Schema

const metadataSchema = Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  createdOn: {
    required: true,
    type: Date,
    set: Date.now,
    default: Date.now
  },
  image: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  id: {
    type: String,
    required: true,
    trim: true,
    unique: true
  }
})

const Metadata = mongoose.model('Metadata', metadataSchema)

module.exports = Metadata
