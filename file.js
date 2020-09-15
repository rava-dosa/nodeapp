var fs = require('fs');
var crypto = require('crypto');
var {performance} = require('perf_hooks');
module.exports=class FileQuery{
    constructor(filepath,indexing_buffer_size,b_size,hash_bucket_size){
        //call updatefilepointerbucket before update hash 
        //check if filepath is valid, not done
        this.filepath=filepath
        this.fd=this.openfile(this.filepath);
        this.indexing_buffer_size = indexing_buffer_size || 1024*1024;
        this.b_size = b_size || 1024;
        this.hash_bucket_size = hash_bucket_size || 1024;
        this.hash_bucket_path="./.hashfilebucket.json"
        this.file_bucket_path="./.filebucket.json"
        this.bucket={}
        this.hashliststore={}
        // var t0 = performance.now()
        this.manageBucketPointer()
        this.manageHashlist()
        // var t1 = performance.now()
        // console.log(t1-t0,"performance");

        //fs.watch not working due to some reason
        // fs.watch(this.filepath,this.update.bind(this))
        this.update()
    }
    /**
     * 
     * @param {string} path 
     * @param {string} mode
     * openfile returns file descriptor 
     */
    openfile(path,mode){
        mode=mode||'r'
        this.fd=null
        this.fd=fs.openSync(path, 'r')
        return this.fd;
    }
    /**
     * 
     * @param {Integer} total 
     * @param {Integer} denominator 
     * Iterleft returns no of iterations to complete with a given buffer size, and no of bytes
     * left after iterations
     */
    iterLeft(total,denominator){
        var iter=Math.floor(total/(denominator))
        var left=total%(denominator)
        return [iter,left]
    }
    /**
     * 
     * @param {Integer} iter 
     * @param {Integer} left 
     * @param {Integer} position 
     * this function takes no of iterations, bytes left after iterations, and position of file to
     * start reading from. Helps in creating and updating bucket. Bucket contains indexes of time of log
     * and where it starts from.
     * Bucket looks like
     * {"1577836811172":{"from":153,"tillDate":1578116561902,"to":irr}}
     * So now any query b/w time 1577836811172 and 1578116561902 will start reading the file 
     * from 153 position
     * irr= currently irrelevant
     */
    filePointerBucketHelper(iter,left,position){
        var buffer = Buffer.alloc(this.indexing_buffer_size);
        for(var loop=0;loop<iter;loop++){
            var size=fs.readSync(this.fd,buffer,0,this.indexing_buffer_size,position)
            var i=0;
            //consider the string in buffer as CompleteString\nCompleteString\nComple
            for(i=size-1;i>=0;i--){
                if(buffer[i]===10){
                    break;
                }
            }
            //Now the i points to ñ
            //CompleteString\nCompleteString\ñComple
            var j=0
            for(j=i-1;j>=0;j--){
                if(buffer[j]===10){
                    break;
                }
            }
            //Now the j points to ñ
            //CompleteString\ñCompleteString\nComple
            var l2=i;
            var l4=j;
            var s1=buffer.toString("utf-8",0,24);
            //24 is the size of timestamp
            var s2=buffer.toString("utf-8",l4+1,l4+25);
            var t1=Date.parse(s1);
            var t2=Date.parse(s2);
            if(isNaN(t1)){
                console.log(s1);
            }else{
                this.bucket[t1]={"from":position,"tillDate":t2,"to":l2+position};
            }
            position=position+l2+1;
        }
        var size=fs.readSync(this.fd,buffer,0,left,position)
        var s1=buffer.toString("utf-8",0,24);
        var t1=Date.parse(s1);
        this.bucket[t1]={"from":position,"tillDate":NaN,"to":NaN};
    }
    /**
     * initialises file pointer bucket and saves it
     */
    createFilePointerBucket(){
        var total=fs.fstatSync(this.fd).size;
        var iterLeft=this.iterLeft(total,this.indexing_buffer_size);
        var iter=iterLeft[0];
        var left=iterLeft[1];
        var position=0;
        this.filePointerBucketHelper(iter,left,position)
        var json = JSON.stringify(this.bucket);
        fs.writeFileSync(this.file_bucket_path, json, 'utf8');
        // console.log(l)
    }
    /**
     * 
     * @param {Buffer} buffer 
     * @param {Integer} start 
     * @param {Integer} end 
     * takes input a buffer and outputs newlines as a list
     * We can add function as input for maing it more generic
     */
    getlines(buffer,start,end){
        var lines=[]
        var i=0;
        var tempstart=start;
        var i=tempstart
        for(i=tempstart;i<end;i++){
            if(buffer[i]===10){
                lines.push(buffer.toString("utf8",tempstart,i))
                tempstart=i+1;
            }
        }
        return lines;
    }
    /**
     * 
     * @param {String} line 
     * Takes input a line and outputs timestamp
     */
    getdate(line){
        var d1=Date.parse(line.slice(0,24))
        return d1;
    }
    /**
     * 
     * @param {String} date 
     * @param {String[]} lines 
     * takes input date, and lines of logs and outputs a list comprising of 
     * logs less than that date
     * Small bug -> It also adds the last line which might be greater than the given date
     */
    checkdate(date,lines){
        var size=lines.length
        var i=0;
        for(i=0;i<size;i++){
            var date1=this.getdate(lines[i]);
            if(isNaN(date1)){
                console.log("checkdate, Nan found")
                continue;
            }
            if(date1>date){
                break;
            }
        }
        if(i===size){
            return lines
        }else{
            return lines.slice(0,i)
        }
    }
    /**
     * 
     * @param {Integer} startsFrom 
     * @param {String} enddate 
     * Main function which takes in all input and variables to output an approximate-
     * ly good range of logs
     */
    getlog(startsFrom,enddate){
        // console.log(startsFrom,enddate)
        var buffer = Buffer.alloc(this.b_size);
        var st=0;
        var total=fs.fstatSync(this.fd).size;
        var iterLeft=this.iterLeft(total,this.b_size)
        var iter=iterLeft[0]
        var left=iterLeft[1];
        var i1=0;
        var ret=[]
        var break_loop=false;
        for(i1;i1<=iter;i1++){
            var size=fs.readSync(this.fd,buffer,0,this.b_size,startsFrom)
            var ret1=this.getlines(buffer,0,size)
            var ret2=this.checkdate(enddate,ret1)
            ret=ret.concat(ret2)
            for(var x=size-1;x>=0;x--){
                if(buffer[x]===10){
                    startsFrom=startsFrom+x+1
                    break;
                }
            }
            if(ret1.length===ret2.length){
            }else{
                break_loop=true;
                break;
            }
        }
        if(!break_loop){
            var size=fs.readSync(this.fd,buffer,0,left,startsFrom)
            var ret1=this.getlines(buffer,0,size)
            var ret2=this.checkdate(enddate,ret1)
            ret=ret.concat(ret2)
        }
        return ret;
    }
    /**
     * 
     * @param {Integer} val 
     * @param {Integer} comp 
     * if lookahead(1) possible then returns true
     */
    checkmax(val,comp){
        if(val+1<=comp){
            return true;
        }else{
            return false;
        }
    }
    /**
     * 
     * @param {Integer} val 
     * @param {Integer} comp 
     * if lookback(1) possible then returns true
     */
    checkmin(val,comp){
        if(val-1>=comp){
            return true;
        }else{
            return false;
        }
    }
    /**
     * 
     * @param {Integer} fromInt 
     * @param {Integer[]} keys
     * Modified binary Search to output an number just less than fromInt 
     */
    getrange(fromInt,keys){
        var start=0;
        var end=keys.length;
        const length=keys.length-1;
        if(fromInt<=keys[0]){
            return keys[0]
        }else if(fromInt>=keys[length]){
            return keys[length]
        }
        while(1){
            var mid=Math.floor((start+end)/2)
            if(mid===length || mid===0 || start===mid){
                break;
            }
            if(fromInt>keys[mid]){
                start=mid;
                if(this.checkmax(mid,length)){
                    if(fromInt<keys[mid+1]){
                        return keys[mid]
                    }
                }
            }else if(fromInt<keys[mid]){
                end=mid;
                if(this.checkmin(mid,length)){
                    if(fromInt>keys[mid-1]){
                        return keys[mid-1]
                    }
                }
            }
            else if(fromInt===keys[mid]){
                return keys[mid]
            }
        }
        return keys[mid]
    }
    /**
     * 
     * @param {Integer} fromInt 
     * @param {String[]} lis 
     */
    filter(fromInt,lis){
        var i=0;
        for(i=0;i<lis.length;i++){
            if(fromInt<=this.getdate(lis[i])){
                break;
            }
        }
        return lis.slice(i)
    }
    /**
     * 
     * @param {Buffer} buffer 
     * @param {Integer} startsFrom 
     * @param {Integer} toReadSize 
     * Returns hash and position where to read next
     */
    hashhelper(buffer,startsFrom,toReadSize){
        var toRead=toReadSize||this.hash_bucket_size
        var size=fs.readSync(this.fd,buffer,0,toRead,startsFrom)
        var hash = crypto.createHash('sha256').update(buffer).digest("hex");
        startsFrom=startsFrom+size;
        return [hash,startsFrom]
    }
    /**
     * 
     * @param {Integer} total 
     * @param {Integer} iter 
     * @param {Integer} left 
     * Creates and updates the hashlist metadata store
     */
    hashlist(total,iter,left){
        var buffer=Buffer.alloc(this.hash_bucket_size);
        var startsFrom=0;
        var ret=this.hashliststore["filled"] || [];
        for(var i=0;i<iter;i++){
            var temp=this.hashhelper(buffer,startsFrom);
            ret.push(temp[0]);
            startsFrom=temp[1];
        }
        var unfilled=this.hashhelper(buffer,startsFrom,left);
        var metadata={};
        metadata["size"]=total;
        metadata["filled"]=ret;
        metadata["unfilled"]=unfilled[0];
        metadata["hash_bucket_size"]=this.hash_bucket_size;
        return metadata;
    }
    /**
     * Returns current filesize
     */
    getfilesize(){
        return fs.fstatSync(this.fd).size;
    }
    /**
     * Creates and stores hashlist metadata
     */
    createHashlist(){
        var total=this.getfilesize();
        var iterLeft=this.iterLeft(total,this.hash_bucket_size);
        var iter=iterLeft[0];
        var left=iterLeft[1];
        var metadata=this.hashlist(total,iter,left);
        var json = JSON.stringify(metadata);
        fs.writeFileSync(this.hash_bucket_path, json, 'utf8');
        return metadata;
    }
    /**
     * Updates Filepointer bucket
     */
    updateFilePointerBucket(){
        //partial implementation, assuming append only file
        var total=this.getfilesize()
        if(this.hashliststore["size"]===total){
            return;
        }
        var keys=Object.keys(this.bucket)
        var position=this.bucket[keys[keys.length-1]]["from"]
        total=total-this.hashliststore["size"]
        var iterLeft=this.iterLeft(total,this.indexing_buffer_size);
        var iter=iterLeft[0];
        var left=iterLeft[1];
        this.filePointerBucketHelper(iter,left,position)
        var json = JSON.stringify(this.bucket);
        fs.writeFileSync(this.file_bucket_path, json, 'utf8');
    }
    /**
     * Updates hashlist
     */
    updateHashlist(){
        //will not check if total file size if different or not
        //partial implementation, assuming append only file
        var temp=this.hashliststore;
        var current=this.getfilesize()
        var position=temp["filled"]*temp["hash_bucket_size"]
        var diff=current-position
        var iterLeft=this.iterLeft(diff,this.hash_bucket_size);
        this.hashliststore = this.hashlist(current,iterLeft[0],iterLeft[1])
        var json = JSON.stringify(this.hashliststore);
        fs.writeFileSync(this.hash_bucket_path, json, 'utf8');
    }
    /**
     * Manages hashlist, checks if file already exist or not
     */
    manageHashlist(){
        if (fs.existsSync(this.hash_bucket_path)) {
            let data=fs.readFileSync(this.hash_bucket_path);
            this.hashliststore=JSON.parse(data);
        }else{
            this.hashliststore=this.createHashlist()
        }
    }
    /**
     * Manages File Pointer bucket
     */
    manageBucketPointer(){
        if (fs.existsSync(this.file_bucket_path)) {
            let data=fs.readFileSync(this.file_bucket_path);
            this.bucket=JSON.parse(data);
            this.updateFilePointerBucket();
        }else{
            this.createFilePointerBucket();
        }       
    }
    /**
     * Update order
     */
    update(){
        console.log("FS update called")
        if(this.hashliststore["size"]!=this.getfilesize()){
            this.updateFilePointerBucket()
            this.updateHashlist()
        }else{
            console.log("FS update called, but not updated")
        }
    }
    /**
     * 
     * @param {String} from 
     * @param {String} to 
     */
    queryhelper(from,to){
        // fd=openfile("./example.txt")
        // var l=readfile(fd);
        var keys=Object.keys(this.bucket)
        var fromInt=Date.parse(from)
        var toInt=Date.parse(to)
        var fromInt1=this.getrange(fromInt,keys)
        var x=this.getlog(this.bucket[fromInt1]["from"],toInt)
        return this.filter(fromInt,x);
    }
}