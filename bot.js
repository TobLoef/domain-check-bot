// Bot.js
var Promise = require("bluebird");
var request = require("request-promise");
var Twit = require("twit");
var validator = require("validator");
var fs = require("fs");

var GODADDY_API_URL = "https://sg.godaddy.com/domainsapi/v1/search/exact?q=";

////////// Twit \\\\\\\\\\
var keys = JSON.parse(fs.readFileSync("keys.json"));

var T = new Twit(keys);

var stream = T.stream('statuses/filter', {
	track: "@domaincheckbot"
});
stream.on("tweet", parse);

////////// Functions \\\\\\\\\\
function parse(tweet) {
	var text = (tweet.entities.urls.length > 0) ? tweet.entities.urls[0].expanded_url : tweet.text;
	var domain = text.replace(/http(s?):\/\/|@.+ /gi, "");

	if (validator.isFQDN(domain)) {
		check(domain)
		.then(function(response) {
			respond(response, tweet.id_str, tweet.user.screen_name);
		})
		.catch(function(err) {
			throw err;
		});
	}
}

function check(domain) {
    return new Promise(function(resolve, reject) {
        request(GODADDY_API_URL + domain)
        .then(function(response) {
            resolve(JSON.parse(response));
        })
        .catch(reject);
    });
}

function respond(response, statusId, username) {
	var domain = response.ExactMatchDomain;
	var reply = "@" + username + " The domain " + domain.Fqdn + " is " + (domain.IsAvailable ? "available!" : "NOT available.");
	console.log(reply);
	
	T.post("statuses/update", {
		in_reply_to_status_id: statusId,
		status: reply
	}, function(err, data, response) {
		if (err) {
			throw err;
		}
	});
}
