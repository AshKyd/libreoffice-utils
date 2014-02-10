var fs = require('fs');
var xml2js = require('xml2js');
var csvWriter = require('csv-write-stream')

var writer = csvWriter({
	headers: ['Property','Type','Value']
});
writer.pipe(fs.createWriteStream('out.csv'));

var mainxcd = fs.readFileSync('main.xcd','utf-8');

var parser = new xml2js.Parser({
	explicitArray: false
});

var properties = [];
var indexedProperties = {};

parser.parseString(mainxcd,function(err,parse){

	// Top level nodes
	var nodes = [];
	// nodes = nodes.concat(parse['oor:data']['oor:component-data'])
	nodes = nodes.concat(parse['oor:data']['oor:component-schema'])

	// For each top level oor:component-data node...
	nodes.forEach(function(thisNode){
		var package = thisNode.$['oor:package'];
		var name = thisNode.$['oor:name'];
		scanXmlTree(null,thisNode,'',0);
	});

});

/**
 * Scan the XML tree and make an index of values by path.
 * TODO: Logic for converting this into a proper registry key.
 */
function scanXmlTree(elementType,node,path,i){

	i++;

	if(!node){
		return;
	}

	if(!node.$ && ['templates','component'].indexOf(elementType) == -1){
		return;
	}

	console.log(i);

	if(node.$){
		// console.log(node.$['oor:package']);
		if(node.$['oor:package']){
			path += '/'+node.$['oor:package'];
		}
		path += '/'+node.$['oor:name'];
	} else {
		// path += '/'+elementType;
	}

	['node','prop','group','set', 'component','group','templates'].forEach(function(elementType){
		var thisElement = node[elementType];
		if(thisElement && thisElement.forEach){
			thisElement.forEach(function(thisElement){
				scanXmlTree(
					elementType,
					thisElement,
					path,
					i
				);
			});
		} else {
			scanXmlTree(
				elementType,
				thisElement,
				path,
				i
			);
		}
	});

	if(typeof node.value != 'undefined' && !indexedProperties[path]){
		// We've finally reached a settable property.
		writer.write([
			path,
			node.$ && node.$['oor:type'],
			parseValue(node.value)
		]);

		// Index this so we don't end up with duplicates.
		indexedProperties[path.replace('\/','.')] = path;
	}

	return path;
}

/**
 * parseValue
 * Parse a "vaue" node and return both a data type and the value of the node.
 * @param  {object|string} value - Value as presented in the XML.
 * @return {array}                 Array containing [type,value]
 */
function parseValue(value){
	// Underscores
	if(value._){
		return value._;
	}

	// oor:external
	if(value.$ && value.$['oor:external']){
		return JSON.stringify(value.$['oor:external']);
	}

	// it
	if(value.it){
		// Sometimes these are arrays.
		return JSON.stringify(value.it);
	}

	// What the hell is this. Some properties are weird and contain multiple
	// values. These will be returned here.
	return value;
}