// require("sdk/preferences/service").set('extensions.sdk.console.logLevel', 'info');
var pageMod = require("sdk/page-mod");
var self = require("sdk/self");
var { MatchPattern } = require("sdk/util/match-pattern");
var preferences = require("sdk/simple-prefs");

// Create a page mod
// It will run a script whenever a ".org" URL is loaded
// The script replaces the page contents with a message
pageMod.PageMod({
	include: /.*wikipedia.org\/wiki\/.*/,
	contentScriptOptions: {
		articlesPerPage: preferences.prefs["articlesPerPage"]
	},
	contentScriptFile: [
		self.data.url("react-with-addons-0.12.2.min.js"),
		self.data.url("jquery-2.1.3.min.js"),
		self.data.url("safeParse.js"),
		self.data.url("primary.js"),
	],
	contentScriptWhen: "ready",
	contentStyleFile: self.data.url("style.css"),
	onAttach: function(worker) {
      preferences.on("articlesPerPage", function(pref) {
          worker.port.emit('prefchange', preferences.prefs[pref]);
      });
	}
});
