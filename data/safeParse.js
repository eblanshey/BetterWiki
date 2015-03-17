var cloneObject = function(obj) {
    return JSON.parse(JSON.stringify(obj))
};

// In Firefox, many objects are "live", like the window object, and it makes it impossible
// to console.log these objects because of circular references. This function allows us
// to log them.
JSON.safeParse = function(obj, parseIt){
    var parseIt = parseIt === true || typeof parseIt === 'undefined' ? true : false;
    var printedObjects = [];
    var printedObjectKeys = [];

    function printOnceReplacer(key, value){
        if ( printedObjects.length > 2000){ // browsers will not print more than 20K, I don't see the point to allow 2K.. algorithm will not be fast anyway if we have too many objects
        return 'object too long';
        }
        var printedObjIndex = false;
        printedObjects.forEach(function(obj, index){
            if(obj===value){
                printedObjIndex = index;
            }
        });

        if ( key == ''){ //root element
             printedObjects.push(obj);
            printedObjectKeys.push("root");
             return value;
        }

        else if(printedObjIndex+"" != "false" && typeof(value)=="object"){
            if ( printedObjectKeys[printedObjIndex] == "root"){
                return "(pointer to root)";
            }else{
                return "(see " + ((!!value && !!value.constructor) ? value.constructor.name.toLowerCase()  : typeof(value)) + " with key " + printedObjectKeys[printedObjIndex] + ")";
            }
        }else{

            var qualifiedKey = key || "(empty key)";
            printedObjects.push(value);
            printedObjectKeys.push(qualifiedKey);
            return value;
        }
    }

    if (parseIt) {
        return JSON.parse(JSON.stringify(obj, printOnceReplacer));
    } else {
        return JSON.stringify(obj, printOnceReplacer);
    }
};