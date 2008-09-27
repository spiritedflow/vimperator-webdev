/**
 * ==VimperatorPlugin==
 * @name			webdev.js
 * @description		Controlling WebDeveloper from Vimperator's CLI
 * @description-ru	Управление WebDeveloper-ом из командной строки Vimperator-а
 * @author			Artem S. <spriritedflow@gmail.com>
 * @link			http://github.com/spiritedflow/vimperator-webdev/wikis
 * @version			0.1
 * ==/VimperatorPlugin==
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Usage:
 *  :webdev <command path>
 *
 * Use 'Tab' for autocompletition and '?' to discover subcommands
 *
 * There is hidden subtree ":webdev .debug" with commands which
 * may be helpful to you if you want to add some new commands or
 * debug the plugin.
 *
 * Tested on:
 *	WebDeveloper version: 1.1.5
 *		url: https://addons.mozilla.org/en-US/firefox/addon/60
 *	Vimperator version: 1.2
 *		url: https://addons.mozilla.org/en-US/firefox/addon/4891
 */


(function() {

/* ********************
 *   COMMAND   TREE
 * ********************/
var commandTree = {

	// Base commands
	'toolbar': [webdeveloper_toggleToolbar, 'Toggle toolbar'],
	'preferences': [webdeveloper_options, 'Web Developer\'s Options'],

	// Clearing cache, cookies and so on
	'clear': {
		'_descr_': 'Clear data ...',
		'auth':	[webdeveloper_clearHTTPAuthentication, "Clear HTTP authentication"],
		'cache':   [webdeveloper_clearCache, "Clear cache"],
		'history': [webdeveloper_clearHistory, "Clear history"],
		'cookies': [webdeveloper_clearSessionCookies, "Clear session cookies"],
	},

	// Outlining frames, tables ... everything
	'outline': {
		'_descr_': 'Outline objects ...',
		'frames': [getToggleByStyle(webdeveloper_outlineFrames,
				"webdeveloper-outline-frames"),
			"Outline frames"],
		'headings': [getToggleByStyle(webdeveloper_outlineHeadings,
				"webdeveloper-outline-headings"),
			"Outline headings"],
		'tables': [getToggleByStyle(webdeveloper_outlineTables,
				"webdeveloper-outline-all-tables"),
			"Outline tables"],
		'blocklevel':[getToggleByStyle(webdeveloper_outlineBlockLevelElements,
				"webdeveloper-outline-block-level-elements"),
			"Outline block level elements"],
		'depricated':[getToggleByStyle(webdeveloper_outlineDeprecatedElements,
				"webdeveloper-outline-deprecated-elements"),
			"Outline depricated elements"],

		// Outline positioned elements
		'positioned': {
			'_descr_': 'Outline positioned elements ...',
			'absolute':[getPositionedToggle('absolute'),
				"Outline absolute positioned elements"],
			'fixed':[getPositionedToggle('fixed'),
				"Outline fixed elements"],
			'relative':[getPositionedToggle('relative'),
				"Outline relative positioned elements"],
			'float':[getToggleByStyle(webdeveloper_outlineFloatedElements,
					"webdeveloper-outline-floated-elements"),
				"Outline floated elements"],
		},
	},

	// All about forms
	'form': {
		'_descr_': 'Do something with forms ...',
		'convert': {
			'_descr_': 'Convert forms method ...',
			'post2get': [ function() {
					webdeveloper_convertFormMethods('get');
				}, 'Convert forms from POST to GET'],
			'get2post': [ function() {
					webdeveloper_convertFormMethods('post');
				}, 'Convert forms from GET to POST'],
		},
		'details': [getToggleByStyle(webdeveloper_displayFormDetails,
				"webdeveloper-display-form-details"),
			"Show details for all forms"],
		'info': [webdeveloper_viewFormInformation,
			"Show information for all forms"],
	},

/*
	// Show source, css and so on
	'show': {
		'_descr_': 'Show info or display tools ...',
		'source':   [null, "Show source code"],
		'css':	  [null, "Show CSS"],
		'forms':	[null, "Show forms information"],
		'size': 	[null, "Show window size"],
	},
*/

	// cmd 'toggle' is more suitable for disable/enable commands,
	// but it begins with 't' as 'toolbar' does and it makes
	// autocompletition a bit more difficult :)
	// So disable -- toggle various things
	'disable': {
		'_descr_': 'Toggle various things ...',
		'cache': [getToggleByPreference(webdeveloper_toggleCache,
				"browser.cache.memory.enable"),
			"Disable caching"],
		'java' : [getToggleByPreference(webdeveloper_toggleJava,
				"security.enable_java"),
			"Disable Java"],
		'javascript' : [getToggleByPreference(webdeveloper_toggleJavaScript,
				"javascript.enabled"),
			"Disable JavaScript"],
	},

	'resize': {
		'_descr_': 'Resize main window ...',
		'_expand_': expandResizeSubmenu,
	},

	// Hidden menu .debug
	'.debug': {
		'loaded_styles': [displayLoadedStyles, "Display loaded styles"],
		'cmd_tree': [displayCommandTree, "Display command tree"],
	},

};

/* ********************
 *     VARIABLES
 * ********************/
var show_hidden = false;
var quick_complete = false;


/* *******************
 *  Helpful functions
 * *******************/

// toggle: common wrapper for all togglefunctions
function toggle(toggleFunc, curValue) {
	var element = document.createElement("input");
	if (!curValue)
		element.setAttribute("checked", true);
	toggleFunc(element);
	// TODO: Check can this code cause memory leaks?
}

// getToggle: translate toggleFunc to only-turn-on,
// or only-turn-off functions
function getToggle (toggleFunc, value) {
	return function () {
			toggle (toggleFunc, ! value);
		}
}

// getToggleByStyle: wrapper for various outline*
// and display* toggle functions.
// styleId may by discovered with help of:
//	 :webdev .debug loaded_styles
function getToggleByStyle (toggleFunc, styleId) {
	return function () {
			var value = webdeveloper_contains (
							webdeveloper_appliedStyles,
							styleId );
			toggle (toggleFunc, value);
		}
}

// getToggleByPreference: wrapper for various disable*
// functions. Preference can be found in the body of
// toggleFunc
function getToggleByPreference (toggleFunc, preference) {
	return function () {
			var value = !webdeveloper_getBooleanPreference(
						preference,
						false);
			toggle (toggleFunc,  value);
		};
}

// getPositionedToggle:
function getPositionedToggle (position) {
	return
		getToggleByStyle (
			function(element) {
				webdeveloper_outlinePositionedElements(position, element)
			},
			"webdeveloper-outline-" + position + "-positioned-elements");
}

function getResizeWindowFunction (size) {
	return function () {
			liberator.log ("Resizing to " + size);
		}
}

function expandResizeSubmenu () {

	return { "800x600": [getResizeWindowFunction ("800x600"),
						 "Resize main window to 800x600"],
			 "640x480": [getResizeWindowFunction ("640x480"),
						 "Resize main window to 640x480"]};
}

// displayLoadedStyles: helpful function for searching styleIds
function displayLoadedStyles () {
	liberator.echo(webdeveloper_appliedStyles.toString() || "none");
	liberator.log(webdeveloper_appliedStyles);
}

// displayCommandTree: shows all command list
// as tabbed tree. This is quick way to get
// all commands at once
function displayCommandTree () {

	//buildTree:
	// recursive walk through expanded command tree
	// see 'expandCommandTree' for details
	// returns formated list of strings to output.
	function formatTree (list, prefix) {
		var res=[];

		for each(var node in list) {
			res.push (prefix + node[0]);
			if (node[1])
				res = res.concat(formatTree (node[1], prefix + "\t"));
		}

		return res;
	}

	var list = formatTree (expandCommandTree (), "\t");
	var result = "webdev\n" + list.join("\n");

	liberator.echo (result);
	//liberator.log ("Command tree:\n" + result);
}




/* ********************
 *   PLUGIN  ENGINE
 * ********************/

// keys:
// like keys for hashes/dictonaries in
// other languages, but with one difference:
// If there is a key '_expand_' then result
// hash will be autoexpanded with results of
// the function the key points to.
function getKeys(obj) {
	var res = [];
	for (var key in obj) {

		if (key == '_expand_') {
			expanded = getKeys(obj['_expand_']());
			res = res.concat(expanded); //TODO: may be we should remove doubles
			continue;
		}
		res.push(key);
	}
	return res;
}

// getValue:
// works as obj[key] but with respect to
// key '_expand_' as it does func "getKeys(obj)"
function getValue(obj, key) {
	if (key in obj)
		return obj[key];

	if (obj['_expand_'])
		return getValue(obj['_expand_'](), key);

	return null;
}

// isIn:
// works as 'key on obj' but with respect to
// key '_expand_'.
function isIn(obj, key) {
	if (key in obj)
		return true;

	if (obj['_expand_'])
		return isIn(obj['_expand_'](), key);

	return false;
}

// expandCommandTree:
// converts command tree into smth like:
//   TREE ::= ["node_name", [SUBTREE]]
//   SUBTREE ::= TREE
// Only node names will be in result tree
function expandCommandTree () {

	//spider: simple depth-first search.
	//with omiting hidden elements.
	function spider (node) {

		// Skip not leafes
		if (node instanceof Array)
			return [];

		// Construct array for this node
		var res = [];
		for each(var k in getKeys(node).sort()) {

			if (k == '_descr_')
				continue;

			if (k[0] == '.' && !show_hidden)
				continue;

			res.push ([k, spider(getValue(node,k))]);
		}
		return res;
	}

	return spider(commandTree);
}

// getSubTree:
// walks in the command tree along a path
// and returns sanitized path and the node at the end
function getSubTree (args) {

	// findLike: finds similar items
	//  Ex:
	//   in:  ('cle', ['clear', 'clearall', 'bear'])
	//	 out: ['clear', 'clearall']
	function findLike (item, array) {
		var res = [];
		for each(var c in array) {
			if (c.substring(0, item.length) == item)
				res.push(c);
		}
		return res;
	}

	// matchCommand:
	// try to find item or similar items
	// in the keys of the node
	function matchCommand(node, item) {
		// If match exactly -> return it
		if (isIn(node,item))
			return [item];

		var like = findLike (item, getKeys(node));
		return (like.length == 0)? [null]:like;
	}

	// walkTree:
	// Recursive tree walking along the path
	// Returns pair: [path, node] where
	//   path = sanitized path or null if there was errors
	//   nore = node where the wolking was stopped
	function walkTree (node, path) {
		//liberator.log ("recursive tree walk: node = " + node + " path = " + path);

		if (path.length == 0)
		return ['', node];

		var head = path.shift();
		if (head == '?')
			return ['', node];

		var like = matchCommand(node, head);

		if (!like) {
			//Nothing found :(

			//liberator.log("for \"" + head + "\" cmd not found");
			return [null, null];
		}
		else  if (like.length == 1) {
			// Direct hit!

			var cmd = like[0];
			//liberator.log("cmd found for \"" + head + "\" : " + cmd);

			var [rpath, rnode] = walkTree (getValue(node,cmd), path);
			if (rpath == null)
				return [rpath, rnode];

			return [cmd + " " + rpath, rnode];
		}
		else {
			// We have variants ...

			//liberator.log("for \"" + head + "\" cmd not found,"
			//	+ "but there are similar commands: "
			//	+ like.toString());

			//Make new node with only subnodes similar to cmd
			var new_node = {}
			for each(var k in like)
				new_node[k] = node[k];

			return ["", new_node];
		}
	}

	var path = args.split(/\s+/);
	return walkTree (commandTree, path);
}

// completeCommand:
// find variants for autocompletition
function completeCommand (args) {

	// getDescr:
	// try to get description from the object
	// or return empty string.
	function getDescr(node) {

		if (node instanceof Array)
			return node[1];
		else if ( isIn(node,"_descr_"))
			return node._descr_;
		else
			return "";
	}

	// If was an error, return no condidates
	var [prefix, obj] = getSubTree (args);
	if (!obj)
		return [0,[]];

	// If there was direct hit, return one candidate
	if (obj instanceof Array)
		return [0, [[prefix, getDescr(obj)]]];

	// Otherwise, format candidates list
	var candidates = [];
	var insert_parent = true;

	for each(var k in getKeys(obj).sort()) {
		if (k == '_default_') {
			candidates.push ([prefix, getDescr(getValue(obj,k))]);
			insert_parent = false;
		}
		else if (k == '_descr_')
			continue;
		else if (k[0] == '.' && !show_hidden)
			continue;
		else
			candidates.push ([prefix + k, getDescr(getValue(obj,k))]);
	}

	// Insert parent "..." if needed
	if (!quick_complete && insert_parent && candidates.length > 1)
		candidates.unshift ([prefix, '...']);

	return [0,candidates];
}

// processCommand:
// finds command in the tree and runs it's function
function processCommand (args) {

	var [prefix, obj] = getSubTree (args);

	if (!obj) {
		liberator.echo ("unknown command");
		return
	}

	if ( !(obj instanceof Array) ) {
		if (isIn(obj,"_default_"))
		obj = obj._default_
		else {
			liberator.echo ("incomplete command, use <Tab> for variants");
			return
		}
	}

	try {
		obj[0]();
	} catch (e) {
		liberator.echo ("error: " + e);
	}
}

// Add user command
liberator.commands.addUserCommand(['webdev'], 'webdeveloper',
	processCommand,
	{
		completer: completeCommand,
	}, true);


})();

// vim: set fdm=marker sw=4 ts=4 et:
