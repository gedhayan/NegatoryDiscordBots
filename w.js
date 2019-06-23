const DarkSky = require('dark-sky')
const darksky = new DarkSky('fcaaa0c45b9f31680b0a7ccca238a2dc') 
darksky.gzip = true;
var convert = require("convert-units")
var NodeGeocoder = require('node-geocoder')
var geoText;
const options = {
  provider: 'openstreetmap',
  //apiKey: '156e611f73db4034937ca2b60b1c4649', 
  formatter: null};

const geocoder = NodeGeocoder(options);

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, suffix, commandData) => {
	const getWeather = (location) => {		
		if(location){
			geocoder.geocode(location)
				.then((res) => {
					geoText = res[0].formattedAddress;
					darksky
						.latitude(res[0].latitude) 
						.longitude(res[0].longitude) 
						.exclude('minutely,hourly,flags')
						.language('en')
						.units('us')
						.extendHourly(false)
						.get()                        
						.then((res) => {  
							msg.channel.createMessage(`${res.currently.summary}, ${res.currently.temperature}F (${convert(res.currently.temperature).from('F').to('C').toPrecision(4)}C) / feels like ${res.currently.apparentTemperature}F (${convert(res.currently.apparentTemperature).from('F').to('C').toPrecision(4)}C) | High: ${res.daily.data[0].temperatureHigh}F (${convert(res.daily.data[0].temperatureHigh).from('F').to('C').toPrecision(4)}C) | Low: ${res.daily.data[0].temperatureLow}F (${convert(res.daily.data[0].temperatureLow).from('F').to('C').toPrecision(4)}C) | Humidity: ${(res.currently.humidity * 100).toPrecision(2)}% | Wind: ${["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"][(Math.floor((res.currently.windBearing / 22.5) + 0.5) % 16)]} @ ${res.currently.windSpeed}mph (${convert(res.currently.windSpeed).from('m/h').to('km/h').toPrecision(4)}km/h) | ${res.daily.data[0].summary} ${Math.floor((res.daily.data[0].precipProbability * 100))}% chance of precipitation (${res.daily.data[0].precipType}) (${geoText})`);
							if(res.alerts)
								msg.channel.createMessage(`${res.alerts[0].title} - ${res.alerts[0].description} - ${res.alerts[0].uri}`);
						}) 
						.catch((err) => {
							msg.channel.createMessage("There was some error: " + err);
					    });
				})
				.catch((err) => {
					msg.channel.createMessage("There was some error: " + err);
				});
		} else {
			msg.channel.createMessage("Must provide a location.");
		}
	}
	
	const locateUser = (usrid, callback) => {
		db.users.findOne({_id: usrid}, (err, userDocument) => {
			if(!err && userDocument && userDocument.customWeatherLocation) {
				callback(userDocument.customWeatherLocation);
			} else {
				callback();
			}
		});
	};
	
	if(!suffix){ // User requesting their own location's weather
		const location = userDocument.customWeatherLocation;
		getWeather(location);
	} else if(suffix.indexOf("set ") === 0) { // User setting location
		const location = suffix.substr(4);
		db.users.updateOne({ _id: userDocument._id }, 
			{ $set: {customWeatherLocation: location }}, 
			(err, res) => {
				if(err) throw err;
				msg.channel.createMessage(`Your location has been set to: ${location}. You can use +w to view your weather.`);
			});		
	} else if(suffix.indexOf("<@")==0) {
		const member = bot.memberSearch(suffix, msg.channel.guild);
		if(member) {
			locateUser(member.id, location => {
				if(location)
					getWeather(location);
				else
					msg.channel.createMessage("User has no location set.");
			});
		}
	} else { // Weather of input
		getWeather(suffix);
	}
  };
