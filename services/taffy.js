







function Taffy(WorkerManager){
var json,db;

//load db from localstorage 	

function load_db(){
json = require('data.json');
db = TAFFY(json); 
};

//find info in sat
function find_info(satnum){
var info = db({id:satnum}).First().Info;
return info;
};

//stores into localstorage, might need to fix function
function store(){
db.store("data.JSON");
};

function find_freq(satnum){
var freq = []; 
freq.push(db({id:satnum}).First().UpFreq);
freq.push(db({id:satnum}).First().DownFreq);
return freq;
};


//Need functions for ways to change data in JSON file

return{
load_db					: load_db,
find_info               : find_info,
store                   : store,
find_freq               : find_freq
};



};