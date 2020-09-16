# Instruction
1. (Please provide example.txt, error case not handled properly, and not present in repo)
```
node index.js example.txt
```
2. First Request is in the form of

```
http://localhost:3000/getlog?from=2020-01-17&to=2020-01-18T07:34:09.451Z
``` 

3. Second Request and other consecutive is in the form of 

```
http://localhost:3000/getlog?id=484c2d88f2ecd03abe1461b5e50b61ed&page=4
```

4. There are some known bugs which I have already mentioned in comments. And some other problems like not checing if file exists or not etc.

5. **Major work is done in file.js**

6. It's almost ready to handle any ***Fs.watch*** thing, but there is some issue

7. Tested and working with node v12.18.3

8. Description of it's working

```
1. from and to describes datetime within which you want the log
2. there is a hard limit of 100 set, at each request you will just get 100 logs
3. In response to all the request, the server returns an id, using which you can make further request to consequent pages. 
4. id, is used as a key to cache the results. For faster response.
5. page is, page variabe for navigation.
6. From and to is not needed in further request. Just the id.
7. Github repo navigation uses similar way of pagination.
```
