const express = require('express')
const app = express()
const cors = require('cors')
app.use(express.json())
app.use(cors({
    origin: 'http://localhost:3000', // your frontend origin
    credentials: true // if you're using cookies
  }))

require('dotenv').config()

const path = require('path')
const dbPath = path.join(__dirname, 'maps.db')
console.log(dbPath)

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

const {v4: uuidv4} = require('uuid')

const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

let db = null

const intializeDbAndServer = async () => {
    try {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        })

        app.listen(process.env.PORT || 3000, () => {
            console.log('Server running at http://localhost:3000')
        })
    } catch (e) {
        console.log(`DB Error: ${e.message}`)
    }
}

intializeDbAndServer()

/*Add User API
app.post('/register/', async (request, response) => {
    const {username, name, password, location, gender, profilePic} = request.body

    const hashedPassword = await bcrypt.hash(password, 10)

    const selectUserQuery = `
        SELECT
            *
        FROM
            user
        WHERE
            username = '${username}';
    `

    const dbUser = await db.get(selectUserQuery)

    if (dbUser === undefined) {
        if (password.length >= 5) {
            const id = uuidv4()

            const createUserQuery = `
                INSERT INTO
                    user(id, username, name, password, gender, location, profile_pic)
                    VALUES('${id}', '${username}', '${name}', '${hashedPassword}', '${gender}', '${location}', '${profilePic}');
            `

            await db.run(createUserQuery)
            response.send('User created successfully')
        }
        else{
            response.status(400)
            response.send('Password is too short')
        }
    }
    else {
        response.status(400)
        response.send('User already exists')
    }
})
*/

//Get Login API
app.post('/api/login/', async (request, response) => {
    const {username, password} = request.body

    const getUserQuery = `
        SELECT
            *
        FROM
            user
        WHERE
            username = '${username}';
    `

    const dbUser = await db.get(getUserQuery)

    if (dbUser === undefined) {
        response.status(400)
        response.send('Invalid user')
    } else {
        const isPasswordMatched = await bcrypt.compare(password, dbUser.password)

        if (isPasswordMatched) {
            const payload = {
                username: username
            }

            const jwtToken = jwt.sign(payload, 'maps')
            response.json({ message: 'Authentication successful', jwtToken })
        } else {
            response.status(400)
            response.send('Invalid Password')
        }
    }
})

//Authentication Middleware Function 
const authenticationToken = (request, response, next) => {
    let jwtToken
    const authHeader = request.headers['authorization']

    if (authHeader !== undefined) {
        jwtToken = authHeader.split(' ')[1]
    }

    if (jwtToken === undefined) {
        response.status(401)
        response.send('Invalid JWT token')
    } else {
        jwt.verify(jwtToken, 'maps', async (error, payload) => {
            if (error) {
                response.status(401)
                response.send('Invalid JWT token')
            } else {
                next()
            }
        })
    }
}

//GET Dashboard API
app.get('/api/dashboard/', authenticationToken, async (request, response) => {
    const getCitiesQuery = `
        SELECT
            *
        FROM
            cities;
    `

    const citiesArray = await db.all(getCitiesQuery)
    response.send(citiesArray)
})

//GET Map API
app.get('/api/map/:id', authenticationToken, async (request, response) => {
    const {id} = request.params
    
    const getCityQuery = `
        SELECT
            *
        FROM
            cities
        WHERE
            id = ${id};
    `
    const city = await db.get(getCityQuery)
    const cityName = city.name

    const getCityCoordinates = `
        SELECT
            *
        FROM
            location
        WHERE
            name = '${cityName}';
    `

    const cityCoordinates = await db.get(getCityCoordinates)
    response.send(cityCoordinates)
})