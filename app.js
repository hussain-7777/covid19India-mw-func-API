const express = require('express')
const app = express()
app.use(express.json())
const path = require('path')
const dbPath = path.join(__dirname, 'covid19IndiaPortal.db')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')

let db = null
const initDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.messsage}`)
    process.exit(1)
  }
}
initDBAndServer()

// Login API
app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const getUserQuery = `select * from user where
    username = '${username}';`
  const user = await db.get(getUserQuery)
  if (user === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, user.password)
    if (isPasswordMatched) {
      const payload = {username: username}
      jwtToken = jwt.sign(payload, 'MY_SECRET_TOKEN')
      response.send({jwtToken: jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

// Authenticate token API
const authenticateToken = (request, response, next) => {
  let jwtToken
  const authHeader = request.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'MY_SECRET_TOKEN', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        request.username = payload.username
        next()
      }
    })
  }
}

// Get states API
app.get('/states/', authenticateToken, async (request, response) => {
  const getStatesQuery = `select state_id as stateId,
  state_name as stateName, population from state;`
  const states = await db.all(getStatesQuery)
  response.send(states)
})

// Get state
app.get('/states/:stateId/', authenticateToken, async (request, response) => {
  const {stateId} = request.params
  const getStateQuery = `select state_id as stateId,
  state_name as stateName, population from state 
  where state_id = ${stateId};`
  const state = await db.get(getStateQuery)
  response.send(state)
})

// Create district
app.post('/districts/', authenticateToken, async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const createDistrictQuery = `insert into district
  (district_name, state_id, cases, cured, active, deaths) values 
  ('${districtName}', '${stateId}', '${cases}', '${cured}', 
  '${active}', '${deaths}');`
  const newDistrict = await db.run(createDistrictQuery)
  response.send('District Successfully Added')
})

// Get district
app.get(
  '/districts/:districtId/',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const getDistrictQuery = `select district_id as districtId,
  district_name as districtName, state_id as stateId, cases, cured, 
  active, deaths from district where district_id = ${districtId};`
    const district = await db.get(getDistrictQuery)
    response.send(district)
  },
)

// Delete district
app.delete(
  '/districts/:districtId/',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const deleteDistrictQuery = `delete from district 
  where district_id = ${districtId};`
    const deletedDistrict = await db.run(deleteDistrictQuery)
    response.send('District Removed')
  },
)

// Update district
app.put(
  '/districts/:districtId',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const {districtName, stateId, cases, cured, active, deaths} = request.body
    const updateDistrictQuery = `update district set 
  district_name = '${districtName}', state_id = '${stateId}',
  cases = '${cases}', cured = '${cured}', active = '${active}',
  deaths = '${deaths}' where district_id = ${districtId};`
    const updatedDistrict = await db.run(updateDistrictQuery)
    response.send('District Details Updated')
  },
)

// Get stats
app.get(
  '/states/:stateId/stats',
  authenticateToken,
  async (request, response) => {
    const {stateId} = request.params
    const getStatsQuery = `select sum(cases) as totalCases, 
  sum(cured) as totalCured, sum(active) as totalActive, 
  sum(deaths) as totalDeaths from district where state_id = ${stateId};`
    const stats = await db.get(getStatsQuery)
    response.send(stats)
  },
)

module.exports = app;
