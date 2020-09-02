const express = require('express');
require("dotenv").config();
const cors = require("cors");
const superagent = require('superagent');
const pg = require('pg');

const server = express();
const PORT = process.env.PORT || 3000;
const client = new pg.Client(process.env.DATABASE_URL);

let cordinate = [];
let areaName;


server.use(cors())

server.get('/', (request, response) => {
    response.status(200).send("Good job!");
})

server.get('/location', locationHandler);
server.get('/weather', weatherHandler);
server.get('/trails', trailHandler);
server.get('/movies', movieHandler);
server.get('/yelp', yelpHandler);
server.use('*', notFoundHandler);
server.use(errorHandler);

function checkDB(city) {
    let SQL = `SELECT * FROM locations WHERE search_query=$1;`;
    let values = [city];

    return client.query(SQL, values)
        .then(results => {
            if (results.rows.length == 0) {
                console.log("Checking | API allowed");
                return true;
            } else {
                console.log("Checking | API not allowed")
                return results.rows;
            }
        })
}

function saveLocDB(data) {
    let SQL = `INSERT INTO locations (search_query,formatted_query,latitude,longitude) VALUES ($1,$2,$3,$4);`;
    let values = [data.search_query, data.formatted_query, data.latitude, data.longitude,];
    return client.query(SQL, values)
        .then((result) => {
            return data;
        })
        .catch((err) => {
            console.log("Error", err);
        });
}


async function locationHandler(request, response) {
    const city = request.query.city;
    let API_allowed = await checkDB(city);
    if (API_allowed === true) {
        await getLocation(city, areaName).then((data) => {
            saveLocDB(data, areaName).then((sData) => {
                response.status(200).json(sData);
            });
        });
    } else {
        await getLocation(city, areaName).then(data => {
            delete API_allowed[0].id;
            response.status(200).json(API_allowed[0]);
        })

    }
}

function getLocation(city) {
    let key = process.env.GEOCODE_API_KEY;
    const url = `https://eu1.locationiq.com/v1/search.php?key=${key}&q=${city}&format=json&limit=1`;
    return superagent.get(url)
        .then(data => {
            cordinate = [];
            const location = new Location(city, data.body);
            return location;
        })
}

function Location(city, geoData) {
    this.search_query = city;
    this.formatted_query = geoData[0].display_name;
    this.latitude = geoData[0].lat;
    this.longitude = geoData[0].lon;
    cordinate.push(this.latitude, this.longitude);
    let lengthFQ = this.formatted_query.split(', ');

    if (lengthFQ.length == 1) {
        areaName = lengthFQ[0];
    } else {
        areaName = lengthFQ[lengthFQ.length - 1];
    }

}


function weatherHandler(request, response) {
    const search_query = request.query.search_query;
    getWeather(search_query)
        .then(dataWeather => response.status(200).json(dataWeather));
}

function getWeather(search_query) {
    let key = process.env.WEATHER_API_KEY;
    const url = `http://api.weatherbit.io/v2.0/forecast/daily?key=${key}&city=${search_query}&days=8`;

    return superagent.get(url)

        .then(data => {
            let eightDays = data.body.data;
            let eightDaysMap = eightDays.map((item) => {
                return new Weather(item);
            })
            return eightDaysMap;
        })
}

function Weather(weatherData) {
    this.forecast = weatherData.weather.description;
    this.time = weatherData.datetime;
}


function trailHandler(request, response) {
    getTrail(cordinate, areaName)
        .then(dataTrail => response.status(200).json(dataTrail));
}

function getTrail(cordinate) {
    let key = process.env.TRAIL_API_KEY;
    const url = `https://www.hikingproject.com/data/get-trails?lat=${cordinate[0]}&lon=${cordinate[1]}&maxResults=10&key=${key}`;

    return superagent.get(url)

        .then(data => {
            let tenTrails = data.body.trails;
            let tenTrailsMap = tenTrails.map((item) => {
                return new Trail(item);
            })
            return tenTrailsMap;
        })
}

function Trail(trailData) {
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

function movieHandler(request, response) {
    getMovie(areaName)
        .then(dataMovie => response.status(200).json(dataMovie));
}

async function getMovie(areaName) {
    let key = process.env.MOVIE_API_KEY;
    const areaURL = `https://api.themoviedb.org/3/configuration/countries?api_key=${key}`;
    let x;
    let isoName;
    await superagent.get(areaURL).then(data => {
        let isoArr = data.body;
        
        isoArr.forEach((item, index) => {
            if (item.english_name == areaName) {
                x = index;
                console.log(index);
            }else if(areaName == "USA"){
                x = 226;
            }
            
        })
        isoName = isoArr[x].iso_3166_1;
    })

    const url = `https://api.themoviedb.org/3/discover/movie?api_key=${key}&region=${isoName}&sort_by=popularity.desc`;

    return superagent.get(url)
    .then(data =>{
        let twnMovies = data.body.results;
        let twnMoviesMap = twnMovies.map((item) =>{
            return new Movie(item);
        })
        return twnMoviesMap;
    })
    .catch((err) => {
        console.log("Error", err);
    });
}

function Movie(movieData) {
    this.title = movieData.title;
    this.overview = movieData.overview;
    this.average_votes = movieData.average_votes;
    this.total_votes = movieData.total_votes;
    this.image_url = movieData.image_url;
    this.popularity = movieData.popularity;
    this.released_on = movieData.released_on;
}

function yelpHandler(request, response) {
    getYelp(cordinate)
        .then(dataYelp => response.status(200).json(dataYelp));
}

async function getYelp(cordinate) {
    let key = process.env.YELP_API_KEY;
    const url = `https://api.yelp.com/v3/businesses/search?term=restaurants&latitude=${cordinate[0]}&longitude=${cordinate[1]}`;

    return superagent.get(url).set("Authorization", `Bearer ${key}`)
    .then(data =>{
        let twnRestaurants = data.body.businesses;
        let twnRestaurantsMap = twnRestaurants.map((item) =>{
            return new Yelp(item);
        })
        return twnRestaurantsMap;
    })
    .catch((err) => {
        console.log("Error", err);
    });
}

function Yelp(yelpData) {
    this.name = yelpData.name;
    this.image_url = yelpData.image_url;
    this.price = yelpData.price;
    this.rating = yelpData.rating;
    this.url = yelpData.url;
}

function notFoundHandler(request, response) {
    response.status(404).send('huh?');
}

function errorHandler(error, request, response) {
    response.status(500).send(error);
}

client.connect()
    .then(() => {
        server.listen(PORT, () =>
            console.log(`listening on ${PORT}`)
        );
    })