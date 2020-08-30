const express = require('express');
require("dotenv").config();

const server = express();
const PORT = process.env.PORT || 3000;

server.get('/',(request,response)=>{
    response.status(200).send("Good job!");
})

server.get('/location', (req,res) =>{
    const geoData = require('./data/location.json')
    const cityData = req.query.city;
    let locationData = new Location(cityData,geoData);

    // this will check if the user does not enter a valid location in the input
    let display_name_split = geoData[0].display_name.split(', ');
    display_name_split.push(undefined);

    let check = display_name_split.includes(cityData);
    if(check){
    res.send(locationData);
    }else res.status(500).send("Sorry, something went wrong");
})

function Location (cityData,geoData) {
    this.search_query=cityData;
    this.formatted_query=geoData[0].display_name;
    this.latitude = geoData[0].lat;
    this.longitude = geoData[0].lon;
}


server.get('/weather',(req,res)=>{
    const weatherData = require('./data/weather.json').data;
    let dataWeather = [];
    weatherData.forEach((item) =>{
        let x = new Weather(item);
        dataWeather.push(x);
    })
    res.send(dataWeather);
})

function Weather (weatherData) {
    this.forecast = weatherData.weather.description;
    this.time = weatherData.datetime;
}

server.use("*", (req,res)=>{
    res.status(404).send("Not Found");
})

server.use((error,req,res)=>{
    res.status(500).send(error);
})

server.listen (PORT,()=>{
    console.log(`listening to PORT ${PORT}`);
})