var fs = require('fs');
var xml2js = require('xml2js');

var mainxcd = fs.readFileSync('main.xcd','utf-8');

var parser = new xml2js.Parser({
	explicitArray: false
});

var properties = [];

parser.parseString(mainxcd,function(err,parse){

	// Top level nodes
	var nodes = parse['oor:data']['oor:component-data'];

	// For each top level oor:component-data node...
	nodes.forEach(function(thisNode){
		var package = thisNode.$['oor:package'];
		var name = thisNode.$['oor:name'];
		scanXmlTree('root',thisNode,'');
	})

	// Output a tsv.
	console.log(properties.join('\n'));

});

/**
 * Scan the XML tree and make an index of values by path.
 * TODO: Logic for converting this into a proper registry key.
 */
function scanXmlTree(elementType,node,path){
	if(!node || !node.$){
		return;
	}
	path += '/'+node.$['oor:name'];

	['node','prop','group','set'].forEach(function(elementType){
		var thisElement = node[elementType];
		if(thisElement && thisElement.forEach){
			thisElement.forEach(function(thisElement){
				scanXmlTree(
					elementType,
					thisElement,
					path
				);
			});
		} else {
			scanXmlTree(
				elementType,
				thisElement,
				path
			);
		}
	});

	if(typeof node.value != 'undefined'){
		// We've finally reached a settable property.
		properties.push([
			path,
			parseValue(node.value).join('\t')
		].join('\t'));
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
	if(typeof value == 'string'){
		// Fake booleans
		if(value === 'true' || value === 'false'){
			return ['boolean',value];
		}

		// Plain string
		return ['string',JSON.stringify(value)];
	}

	if(typeof value == 'object'){
		// Underscores
		if(value._){
			return ['funky_string',JSON.stringify(value._)];
		}

		// oor:external
		if(value.$ && value.$['oor:external']){
			return ['oor:external',JSON.stringify(value.$['oor:external'])];
		}

		// it
		if(value.it){
			// Sometimes these are arrays.
			return ['it', JSON.stringify(value.it)];
		}
	}

	// What the hell is this. Some properties are weird and contain multiple
	// values. These will be returned here.
	return ['unknown type', JSON.stringify(value)];
}