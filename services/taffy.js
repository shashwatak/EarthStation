







function Taffy(WorkerManager){
var json,db;

//load db from localstorage 	

function load_db(){
//var json = require("./data.json");

var xobj = new XMLHttpRequest();
        xobj.overrideMimeType("./");
	xobj.open('GET', 'data.JSON', true); // Replace 'my_data' with the path to your file
	xobj.onreadystatechange = function () {
          if (xobj.readyState == 4 && xobj.status == "200") {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
           console.log(xobj.responseText);           
		   db = TAFFY(xobj.responseText);
          }
    };
    xobj.send(null);  
    
};

//find info in sat
function find_info(satnum){
	console.log(satnum);
	satnum = satnum.slice(0, - 1);
	console.log(satnum);
	var records = db().get();
	for(i = 0; i<records.length; i++){
	     if(records[i].Name == satnum){
             console.log(records[i].Info);
	       }
	    };
};

//stores into localstorage, might need to fix function
function store(){
db.store("data.JSON");
};

function find_freq(satnum){

var upfreq;
var downfreq 
satnum = satnum.slice(0, - 1);
console.log(satnum);
	var records = db().get();
	for(i = 0; i<records.length; i++){
	     if(records[i].Name == satnum){
             console.log(records[i].UpFreq);
			 upfreq = records[i].UpFreq;
			 console.log(records[i].DownFreq);
			 downfreq = records[i].DownFreq;
	       }
	    };

return [upfreq,upfreq];

};


//Need functions for ways to change data in JSON file

return{
load_db					: load_db,
find_info               : find_info,
store                   : store,
find_freq               : find_freq
};



};