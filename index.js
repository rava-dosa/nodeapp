var http = require('http');
var url = require('url')
var querystring=require('querystring')
const crypto = require("crypto");
var FileQuery=require("./file")
var DummyCache=require("./cache")
var fnamedata=""
process.argv.forEach(function (val, index, array) {
    if(index==2){
        fnamedata="./"+val;
    }
  });
var file=new FileQuery(fnamedata)

function createheader(res,header,statusCode){
    header = header || {'Content-Type': 'application/json'}
    statusCode = statusCode || 200
    res.writeHead(statusCode, header); // http header
    return res;
}

/**
 * 
 * @param {any} qs 
 * @param {} res 
 */
function requesthelper(page,qs,limit,page,ret){
    id=crypto.randomBytes(16).toString("hex");
    ret["id"]=id
    ret["nextPage"]=2
    var temp=file.queryhelper(qs["from"],qs["to"])
    ret["totalPage"]=Math.ceil(temp.length/limit)+1
    DummyCache[id]=[temp,ret["totalPage"]]
    ret["data"]=temp.slice(limit*(page-1),limit*page)
    return ret;
}
function temp(qs,res){
    //sanitise the input(qs) before using in
    //Date not checked
    var id=qs["id"] || null
    var page=qs["page"] || 1
    var limit=200
    var ret={};
    // console.log(qs)
    if(id!=null){
        //partial implementation
        if(id in DummyCache){
            ret["id"]=id
            ret["nextPage"]=parseInt(page) +1
            var temp=DummyCache[id]
            ret["totalPage"]=temp[1]
            ret["data"]=temp[0].slice(limit*(page-1),limit*page)
        }else{
            ret=requesthelper(page,qs,limit,page,ret)
        }
    }else{
        ret=requesthelper(page,qs,limit,page,ret)
    }
    // var ret=file.queryhelper(qs["from"],qs["to"])
    body=JSON.stringify(ret)
      res.write(body); //write a response
      res.end();
}

http.createServer(function (req, res) {
    var urlObject=url.parse(req.url)
    qs=querystring.decode(urlObject.query)
    res=createheader(res);


    //add your api's here

    listofapi=[
        {"url":"/getlog","method":["GET"],"func":temp}
    ]




    found=false
    listofapi.forEach(elem => {
        if(urlObject.pathname===elem.url && elem.method.some(elem1 => elem1===req.method)){
            found=true
            elem.func(qs,res);
        }
    });
    if(found===false){
        res=createheader(res,{'Content-Type': 'text/html'},404)
        res.write("Not Found")
        res.end()
    }
     //end the response
   }).listen(3000, function(){
    console.log("server start at port 3000"); //the server object listens on port 3000
   });






