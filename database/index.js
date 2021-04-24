const mongoose = require('mongoose')

require('dotenv').config({
    path: './.env'
})

mongoose.connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
})
