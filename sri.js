const unirest = require("unirest");

module.exports = (bot, db, config, winston, userDocument, serverDocument, channelDocument, memberDocument, msg, subreddit, commandData) => {
	var MAX_PAGE_ATTEMPTS = 2;
	var ITEMS_PER_PAGE = 50;
	var path = "";
	var after = "";
	var attemptNumber = 1;
	
	
	if(subreddit) {
		path = "/r/" + subreddit + "/.json?limit="+ITEMS_PER_PAGE+"&after=";
	} else {
		msg.channel.createMessage("Must provide a subreddit.");
	}
	var callback = function(result) {
		if(result.body && result.body.data && result.body.data.children.length !== 0) {
			var data = result.body.data.children;
			var time = new Date();
			if(typeof sri_sentLinks === "undefined"){
				sri_sentLinks = [];
			}
			sri_sentLinks = sri_sentLinks.filter(function(sent){
				return sent.timestamp > time.getTime() - (12*60*60*1000);
			});
			var filteredData = data.filter(function(child){				
				return child && child.data && child.data.url && 
				(child.data.url.indexOf("imgur") !== -1 ||
				child.data.url.indexOf("gfycat") !== -1 || 
				child.data.url.indexOf("gif") !== -1  ||
				child.data.url.indexOf("jpg") !== -1  || 
				child.data.url.indexOf("jpeg") !== -1  ||
				child.data.url.indexOf("redditmedia") !== -1 ||	
				child.data.url.indexOf("i.redd.it") !== -1 ||
				child.data.url.indexOf("discordapp") !== -1 ||						
				child.data.url.indexOf("png") !== -1 );
			});
			filteredData.sort(function(a, b){
				return a.data.url.localeCompare(b.data.url);
			});
			var unsentLinks = [];
			var senti = 0, datai = 0;
			while(datai < filteredData.length){
				if(senti >= sri_sentLinks.length){
					unsentLinks.push(filteredData[datai++]);
					continue;
				}
				var comparison = filteredData[datai].data.url.localeCompare(sri_sentLinks[senti].url);
				if(comparison < 0){
					unsentLinks.push(filteredData[datai++]);
				}else if(comparison > 0){
					senti++;
				}else{
					datai++;
					senti++;
				}
			}
			var c = unsentLinks.length;
			if(c === 0){
				if(attemptNumber++ !== MAX_PAGE_ATTEMPTS){
					after = data[data.length - 1].data.name;
					doSearch();
				}else{						
					msg.channel.createMessage("No image found on " + subreddit + ".");
				}					
				return;
			}
			var rand = Math.floor(Math.random() * (c));         
			var url = unsentLinks[rand].data.url;
			senti = 0;
			while(senti < sri_sentLinks.length && sri_sentLinks[senti] && sri_sentLinks[senti].url && sri_sentLinks[senti].url.localeCompare(url) < 0){
				senti++;
			}
			sri_sentLinks.splice(senti, 0, {"url": url, "timestamp": time.getTime()});
			msg.channel.createMessage(unsentLinks[rand].data.title + ": " + url);
			
			var pattern = /((imgur.com\/a)|(imgur.com\/album)|(imgur.com\/gallery))/;
			var pattern2 = /(imgur.com)/;
			var pattern3 = /\.(jpg|png|gif|bmp)$/;
			if (pattern.test(url))
			{
				var match = url.split('/')[4];
				unirest.get("https://api.imgur.com/3/album/" + match + "/images")
				.header("Authorization", "Client-ID 378ca74b217e4cc")
				.header("Accept", "application/json")
				.end(function (result)
				{
					var lengthh = result.body.data.length;
					if (lengthh > 1)
					{
						if (lengthh > 10)
							lengthh = 10;
						msg.channel.createMessage(lengthh + " images in this album are:");
						for(var i=0; i<lengthh; i++)
							{
							msg.channel.createMessage(result.body.data[i].link);
							}
				}});
			return;
				
			}
			// if ((pattern2.test(url) && !(pattern.test(url))) &&  !(pattern3.test(url)))
			// {
			// msg.channel.createMessage(url + ".jpg");
			// return;
			// }
			
		} else {
			msg.channel.createMessage("No image found on " + subreddit + ".");
		}
	};
	
	var doSearch = function(){			
		unirest.get("https://www.reddit.com" + path + after)
		.header("Accept", "application/json")
		.end(callback);			
	};	
	
	doSearch();
};
