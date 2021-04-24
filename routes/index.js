const express = require('express')
const router = express.Router()
const multer = require('multer')
const upload = multer({ dest: `${__dirname}/../upload` })
const axios = require('axios')
const FormData = require('form-data')
const fs = require('fs')
require('dotenv').config({ path: './.env' })
const Metadata = require('../models/metadata')

const Web3 = require('web3')
const web3 = new Web3(
  `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMYAPIKEY}`
)
const contractABI = require('../constant/TokenABI.json')
const contractAddress = process.env.CONTRACT_ADDRESS

// setImmediate(async () => {
//   const Token = await new web3.eth.Contract(contractABI, contractAddress)

//   console.log(await Token.methods.mint('0x55a0C0243db23E7AdA0A599Fd8635f301D917436', 21022424432151219962016168673823).call())
// })

const _randomInt = (length = 5) => {
  var result = []

  var characters = '123456789'

  var charactersLength = characters.length

  for (var i = 0; i < length; i++) {
    result.push(characters.charAt(Math.floor(Math.random() * charactersLength)))
  }

  return result.join('')
}

const _createNFTType = id => id.padStart(64, '0')

const _uploadImage = async file => {
  const data = new FormData()

  const PINATA_JWT = process.env.PINATA_JWT

  data.append('file', fs.createReadStream(file))

  const config = {
    method: 'post',
    url: 'https://api.pinata.cloud/pinning/pinFileToIPFS',
    headers: {
      Authorization: 'Bearer ' + PINATA_JWT,
      ...data.getHeaders()
    },
    data: data
  }

  fs.unlinkSync(file, () => {})

  const response = await axios(config)

  return response.data
}

router.get('/', function (req, res, next) {
  res.render('index', { title: 'CREATE YOUR OWN NFT' })
})

router.get('/metadata/:nftType', async (req, res, next) => {
  try {
    const { nftType } = req.params

    if (typeof nftType !== 'string' || nftType.length !== 64) {
      throw new Error('NFT_TYPE.INVALID')
    }

    const existingMetadata = await Metadata.findOne({ id: nftType }).lean()

    if (!existingMetadata) {
      throw new Error('NFT_TYPE.NOT_FOUND')
    }

    delete existingMetadata._id

    delete existingMetadata.__v

    res.status(200).json(existingMetadata)
  } catch (error) {
    res.status(400).send(error.message || JSON.stringify(error))
  }
})

router.post('/submitForm', upload.single('image'), async (req, res, next) => {
  try {
    const uploadedFilePath = req.file['path']

    fs.renameSync(uploadedFilePath, uploadedFilePath + '.jpg', err => {
      if (err) {
        throw new Error('IMAGE.NOT_FOUND')
      }
    })

    const { IpfsHash } = await _uploadImage(uploadedFilePath + '.jpg')

    const imageUrl = `https://gateway.pinata.cloud/ipfs/${IpfsHash}`

    const tokenName = req.body['token-name']

    const tokenDescription = req.body['token-des']

    const NFTType = _createNFTType(_randomInt())

    const newMetadata = new Metadata({
      image: imageUrl,
      name: tokenName,
      description: tokenDescription,
      id: NFTType
    })

    const saved = await newMetadata.save()

    delete saved._id

    delete saved.__v

    res.status(200).json(saved)
  } catch (error) {
    res.status(400).send(error.message || JSON.stringify(error))
  }
})

module.exports = router
