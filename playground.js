
new Promise((resolve, reject)=>{
    
    resolve("hello");
})
.then((res)=>{
    throw new Error("ended");
    console.log(res);
})
.catch((reason)=>{
    console.log(reason.message);
})