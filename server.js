const express = require('express');
require("dotenv").config();
const cors = require("cors");
const superagent = require('superagent');

const server = express();
const PORT = process.env.PORT || 3000;

server.use(cors())

server.get('/',(request,response)=>{
    response.status(200).send("Good job!");
})

server.get('/location', locationHandler);
server.get('/weather', weatherHandler);
server.get('/trails', trailHandler);
server.use('*', notFoundHandler);
server.use(errorHandler);

function locationHandler(request, response){
    const city = request.query.city;
    getLocation(city)
    .then(locationData => response.status(200).json(locationData)); 
}

function getLocation(city){
    let key = process.env.GEOCODE_API_KEY;
    const url = `https://eu1.locationiq.com/v1/search.php?key=${key}&q=${city}&format=json&limit=1`;

    return superagent.get(url)
    .then(data =>{
        cordinate = [];
        const location = new Location(city, data.body);
        return location;
    })
}

// server.get('/location', (req,res) =>{
//     const geoData = require('./data/location.json')
//     const cityData = req.query.city;
//     let locationData = new Location(cityData,geoData);

//     // this will check if the user does not enter a valid location in the input
//     let display_name_split = geoData[0].display_name.split(', ').map(v => v.toLowerCase());
//     display_name_split.push(undefined);

//     let check = display_name_split.includes(cityData);
//     if(check){
//     res.send(locationData);
//     }else res.status(500).send("Sorry, something went wrong");
// })

let cordinate = [];

function Location (city,geoData) {
    this.search_query=city;
    this.formatted_query=geoData[0].display_name;
    this.latitude = geoData[0].lat;
    this.longitude = geoData[0].lon;
    cordinate.push(this.latitude, this.longitude)
}

function weatherHandler(request, response){
    const search_query = request.query.search_query;
    getWeather(search_query)
    .then(dataWeather => response.status(200).json(dataWeather)); 
}

function getWeather(search_query){
    let key = process.env.WEATHER_API_KEY;
    const url = `http://api.weatherbit.io/v2.0/forecast/daily?key=${key}&city=${search_query}&days=8`;

    return superagent.get(url)

    .then(data =>{
        let eightDays = data.body.data;
        let eightDaysMap = eightDays.map((item) =>{
            return new Weather(item);
        })
        return eightDaysMap;
    })
}

function Weather (weatherData) {
    this.forecast = weatherData.weather.description;
    this.time = weatherData.datetime;
}

// https://www.hikingproject.com/data/get-trails?lat=40.0274&lon=-105.2519&maxResults=10&key=200894687-479b9155759a33213fbcb6b4d382b210

function trailHandler(request, response){
    getTrail(cordinate)
    .then(dataTrail => response.status(200).json(dataTrail)); 
}

function getTrail(cordinate){
    let key = process.env.TRAIL_API_KEY;
    const url = `https://www.hikingproject.com/data/get-trails?lat=${cordinate[0]}&lon=${cordinate[1]}&maxResults=10&key=${key}`;

    return superagent.get(url)

    .then(data =>{
        let tenTrails = data.body.trails;
        let tenTrailsMap = tenTrails.map((item) =>{
            return new Trail(item);
        })
        return tenTrailsMap;
    })
}

function Trail (trailData) {
    this.name = trailData.name;
    this.location = trailData.location;
    this.length = trailData.length;
    this.stars = trailData.stars;
    this.star_votes = trailData.starVotes;
    this.summary = trailData.summary;
    this.trail_url = trailData.url;
    this.conditions = trailData.conditionDetails;
    this.condition_date = trailData.conditionDate.split(" ")[0];
    this.condition_time = trailData.conditionDate.split(" ")[1];
}



function notFoundHandler(request, response) {
    response.status(404).send('huh?');
  }
  
function errorHandler(error, request, response) {
    response.status(500).send(error);
  }

server.listen (PORT,()=>{
    console.log(`listening to PORT ${PORT}`);
})