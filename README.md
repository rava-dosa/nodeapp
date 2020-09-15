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
http://localhost:3000/getlog?from=2020-01-17&to=2020-01-18T07:34:09.451Z&id=5d6f4a39d0cd83fde295f0769fa16079&page=4
```

4. There are some known bugs which I have already mentioned in comments. And some other problems like not checing if file exists or not etc.

5. **Major work is done in file.js**

6. It's almost ready to handle any ***Fs.watch*** thing, but there is some issue

7. Tested and working with node v12.18.3