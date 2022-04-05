const express = require("express")
const bodyParser = require("body-parser")
const multer = require("multer")
const path = require("path")
const fs = require("fs")

// 全局变量
const HOST = 'localhost'
const PORT = 3033
// 图片合法后缀
const SUFFIXES = {
  png: true,
  jpg: true,
  jpeg: true,
  bmp: true,
  webp: true,
  gif: true
}
const MAX_SIZE = 102400 // 文件大小上限
const IMAGE_URL = 'img' // 图片url前缀
const IMAGE_DIRECTORY = "./images" // 本地保存图片路径

const app = express()
// 设置文件缓存地址
const upload = multer({
  dest: path.join(__dirname, 'temp')
})
// const upload = multer({ dest: __dirname + '/../uploads' });
// var upload = multer({ dest: 'uploads/' })

const checkSuffix = (suffix) => {
  return SUFFIXES[suffix]
}

const checkSize = (size) => {
  return size <= MAX_SIZE
}

const resultInfo = (code, msg, data = null) => {
  return {
    code,
    msg,
    data
  }
}

const handleOk = (data = null) => {
  return resultInfo(200, 'ok', data)
}

const handleError = (msg) => {
  return resultInfo(400, msg)
}

const randomStr = (len) => {
  let name = ''
  while(len-- > 0) {
    name += String.fromCharCode(Math.floor(Math.random() * 26) + 97)
  }
  return name
}

const generateRandomFileName = () => {
  let name = ''
  name += new Date().getTime()
  name += '-' + randomStr(5)
  return name
}

const deleteFile = (file) => {
  console.log(`删除：${file}`)
  fs.unlinkSync(file)
}

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
// 静态文件托管，可以通过 http://localhost:3033/img/xx.png 路径访问图片
app.use('/img', express.static(path.join(__dirname, '/images')));
app.use(express.static('public'))

// 单文件上传
app.post('/api/upload/singleImage', upload.single('file'), (req, res) => {
  try {
    console.log(req.file)
    const file = req?.file
    if (file === undefined) {
      return res.json(handleError('未检测到文件'))
    }
    const originalName = file.originalname
    if (originalName.split('.').length !== 2) {
      return res.json(handleError('图片格式错误'))
    }
    if (!checkSize(file.size)) {
      return res.json(handleError(`图片过大，请确保图片大小在${MAX_SIZE}以内`))
    }
    const suffix = originalName.split('.')[1]
    if (!checkSuffix(suffix)) {
      return res.json(handleError('图片格式错误'))
    }
    const tempFile = file.path
    const fileName = generateRandomFileName();
    const fullFileName = `${fileName}.${suffix}`
    const filePath = `${IMAGE_DIRECTORY}/${fullFileName}`

    fs.readFile(tempFile, (err, data) => {
      if (err) {
        return res.json(handleError('图片保存错误'))
      }
      fs.writeFileSync(path.join(__dirname, filePath), data)
    })
    const url = `http://${HOST}:${PORT}/${IMAGE_URL}/${fullFileName}`
    res.json(handleOk(url))

    deleteFile(tempFile)
  } catch (error) {
    console.log('err233:' + error)
  }
})

app.post('/api/upload/multiImages', upload.array('files', 9), (req, res) => {
  try {
    res.set({
      'content-type': 'application/json; charset=utf-8'
    })
    const files = req.files || ''
    if (!files) {
      return res.json(handleError('未检测到文件'))
    }
    const results = []
    for (const idx in files) {
      const file = files[idx]
      const tempFile = file.path
      const result = {
        name: file.originalname,
        url: '',
        err: ''
      }
      results[idx] = result
      const originalName = file.originalname
      if (originalName.split('.').length !== 2) {
        result.err = '图片名称格式错误'
        deleteFile(tempFile)
        continue
      }

      const suffix = originalName.split('.')[1]
      if (!checkSuffix(suffix)) {
        result.err = '图片类型错误'
        deleteFile(tempFile)
        continue
      }

      if (!checkSize(file.size)) {
        result.err = `图片过大，请确保图片在${MAX_SIZE}以内`
        deleteFile(tempFile)
        continue
      }
      const fileName = generateRandomFileName()
      const fullFileName = `${fileName}.${suffix}`
      const filePath = `${IMAGE_DIRECTORY}/${fullFileName}`

      let flag = true
      fs.readFile(tempFile, (err, data) => {
        if (err) {
          result.err = '图片保存报错'
          flag = false
        } else {
          fs.writeFileSync(path.join(__dirname, filePath), data)
        }
      })
      const url = `http://${HOST}:${PORT}/${IMAGE_URL}/${fullFileName}`
      if (flag) {
        result.url = url
      }
      deleteFile(tempFile)
    }
    res.json(handleOk(results))
  } catch (error) {
    throw  `错误：${error}`
  }
})

app.listen(3033, () => {
  console.log("app is running at port 3033")
})
