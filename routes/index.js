const express = require('express')
const router = express.Router()
const multer = require('multer')
const upload = multer({ dest: `${__dirname}/../upload` })
const axios = require('axios')
const FormData = require('form-data')
const fs = require('fs')
require('dotenv').config({ path: './.env' })
const Metadata = require('../models/metadata')

const HDWalletProvider = require('@truffle/hdwallet-provider')
const provider = new HDWalletProvider({
  mnemonic: process.env.MNEMONIC,
  providerOrUrl: `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMYAPIKEY}`
})
const Web3 = require('web3')
const web3 = new Web3(provider)
const contractABI = require('../constant/TokenABI.json')
const contractAddress = process.env.CONTRACT_ADDRESS
const ethers = require('ethers')
const wallet = ethers.Wallet.fromMnemonic(process.env.MNEMONIC)
const privateKey = wallet.privateKey

const _mintNFT = async nftType => {
  const Token = await new web3.eth.Contract(contractABI, contractAddress)

  const data = await Token.methods
    .mint(process.env.CONTRACT_OWNER, nftType)
    .encodeABI()

  const signedTx = await web3.eth.accounts.signTransaction(
    {
      from: process.env.CONTRACT_OWNER,
      to: process.env.CONTRACT_ADDRESS,
      data: data,
      gas: 200000
    },
    privateKey
  )

  await web3.eth
    .sendSignedTransaction(signedTx.rawTransaction)
    .on('transactionHash', function (hash) {
      console.debug('Transaction Create NFT Hash:', hash)
    })
    .on('receipt', async receipt => {
      console.debug('Transaction Create NFT Receipt:', receipt)
    })
    .on('error', function (error) {
      throw new Error('MINT_TOKEN.FAILED')
    })
}

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

    const hexString = nftType.replace(/^0+/, '')

    const nftTypeId = _createNFTType(parseInt(hexString, 16) + '')

    const existingMetadata = await Metadata.findOne({ id: nftTypeId }).lean()

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

    await _mintNFT(NFTType)

    res.status(200).json(saved)
  } catch (error) {
    res.status(400).send(error.message || JSON.stringify(error))
  }
})

module.exports = router
