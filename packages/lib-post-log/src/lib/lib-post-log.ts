let enabled=false;
let logIndex=0;
const targets:PostLogTarget[]=[];

export interface PostLogTarget
{
    url:string;
    method:'POST'|'PUT'|'GET';
    getQueryParam?:string;
    level:PostLogLevel;
}

export interface PostLogEntry{
    i:number;
    l:PostLogLevel;
    a:any[];
    e?:string;
}

export enum PostLogLevel{
    logLevelLog=1,
    logLevelInfo=2,
    logLevelWarn=4,
    logLevelError=8,
    logLevelDebug=16,
    logLevelAll=31,
}

export const addPostLogTarget=(target:PostLogTarget,noDupUrls=true)=>{
    enablePostLog();
    if(noDupUrls && targets.some(t=>t.url===target.url)){
        return;
    }
    targets.push(target);
}

export const postLogAsync=async (level:PostLogLevel,args:any[]):Promise<void>=>{

    if(!targets.length || !enabled){
        return;
    }

    let entry:PostLogEntry={
        i:logIndex++,
        l:level,
        a:args
    }

    const objs:any[]=[];
    let entryJson:string;

    try{
            entryJson=JSON.stringify(entry,function(key,value){
            if(!value || (typeof value !== 'object')){
                return value;
            }
            const i=objs.indexOf(value);
            if(i===-1){
                objs.push(value);
                return value;
            }else{
                return {__ref__:i}
            }
        })
    }catch(ex){
        const msg=`Unable to stringify log post args - ${(ex as any)?.message}}`;
        entry={
            ...entry,
            a:[msg],
            e:msg
        }
        entryJson=JSON.stringify(entry)
    }

    await Promise.all(targets.map(async t=>{
        if(!(t.level&level)){
            return;
        }

        try{
            if(t.method==='GET'){
                await fetch(`${t.url}${t.url.includes('?')?'&':'?'}${t.getQueryParam??'log'}=${encodeURIComponent(entryJson)}`);
            }else{
                await fetch(t.url,{
                    method:t.method,
                    body:entryJson
                })
            }
        }catch(ex){
            console.warn(DoNotPostLogEntry,'Post log entry failed',t);
        }

    }))
}

export const DoNotPostLogEntry=Symbol();


export const enablePostLog=()=>{
    if(enabled){
        return;
    }
    enabled=true;

    const log=console.log;
    const info=console.info;
    const warn=console.warn;
    const error=console.error;
    const debug=console.debug;

    console.info=(...args:any[])=>{
        info.call(console,...args);
        if(!args.includes(DoNotPostLogEntry)){
            postLogAsync(PostLogLevel.logLevelInfo,args);
        }
    }

    console.log=(...args:any[])=>{
        log.call(console,...args);
        if(!args.includes(DoNotPostLogEntry)){
            postLogAsync(PostLogLevel.logLevelLog,args);
        }
    }

    console.warn=(...args:any[])=>{
        warn.call(console,...args);
        if(!args.includes(DoNotPostLogEntry)){
            postLogAsync(PostLogLevel.logLevelWarn,args);
        }
    }

    console.error=(...args:any[])=>{
        error.call(console,...args);
        if(!args.includes(DoNotPostLogEntry)){
            postLogAsync(PostLogLevel.logLevelError,args);
        }
    }

    console.debug=(...args:any[])=>{
        debug.call(console,...args);
        if(!args.includes(DoNotPostLogEntry)){
            postLogAsync(PostLogLevel.logLevelDebug,args);
        }
    }


}

