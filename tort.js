 "use strict";
 const Discord = require('discord.js')

 const fs = require('fs')
 let jsonData = JSON.parse(fs.readFileSync('settings.json', 'utf-8'))
 const TOKEN = jsonData.token;
 
 const bot = new Discord.Client();
 const BOT_ID = '541338820772233231';
 const OWNER_ID = '192461753542639617';
 const OWNER_ID2 = '323218204014936069';
 const MAX_VIDS = 5;
 const MAX_VOL = 100; //vol can go as high or low as desired, however anything will distort the sound.  1000 sounds extremely distorted
 const INIT_VOL = 25;
 const YOUTUBE_URL_VIDEO = "https://www.youtube.com/watch?v=";
 const YOUTUBE_URL_SEARCH = "https://www.youtube.com/results?search_query=";
 const TEST_CHANNEL_ID = 428015548325036032;
 const MUSIC_CHANNEL_ID = 598554308585455629;
 const HTML_URL_INDEX = "<li><div class=\"yt-lockup yt-lockup-tile yt-lockup-video vve-check clearfix\" data-context-item-id=\""
 const PLAYLS_DIR = "./playlists/";
 var volume = INIT_VOL;
 var queue = [];
 var playing = false;
 var ytdl = require('ytdl-core');
 var connectionGlobal;
 var rp = require('request-promise');

 ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
 //POTENTIAL ADD-ONS and problems
 //remove colons from all commands because you know they are annoying
 //cant play mature content
 //cant play streams/live videos
 //rotating queue: will play one song from someone, then the next is from someone else
 //playlists: probably files with links in them and potentially a way to update said playlists
 //option to normal queueing or rotating queueing
 ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

 class Song {
    constructor(url,name) {
        this.url = url;
        this.name = name;
    }
 }

 ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
 
 //bot.on('debug', console.log)
 bot.on('message',(message) => {
    //Stops bot from responding to itself
    if (message.author == bot.user) {
        return;
    }
    
    //kill command: kill + @bot  //done this way to shut down multiple bots with one command.
    if(message.author.id == OWNER_ID || message.author.id == OWNER_ID2){
        if(message.content.startsWith('kill') && message.content.includes('@'+BOT_ID)){
            message.channel.send("Terminating Program Tort\nGoodbye OwO");
            setTimeout(function(){
                process.exit(1);
            }, 85);
        }
    }

    //music commands
    if(message.channel.id == MUSIC_CHANNEL_ID || message.channel.id == TEST_CHANNEL_ID ){
        musicCommand(message);
    }
 })

 ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

 function musicCommand(message) {
    //help command
    var msg = message.content.toLowerCase(); //removes case sensitivity
    if(msg == "help") {
        message.channel.send("```help == displays list of commands\n\n"
                + "search:Search_Request == returns the top result of the search request from YouTube\n\n"
                + "search#:Search_Request == returns top results of search request from YouTube [1 < # < "+MAX_VIDS+"]\n\n"
                + "play Search_Request/YouTube_URL == adds the first seach result or url to the queue and begins queue if not already playing\n\n"
                + "play == unpauses the stream if paused\n\n"
                + "pause == pauses the stream if playing\n\n"
                + "skip == skips the current song in queue\n\n"
                + "vol:# == sets the volume of the number inputed. [0 < # < "+MAX_VOL+"]\n\n"
                + "volreset == resests the volume to the initial volume:"+INIT_VOL+"\n\n"
                + "volmax == sets the volume to the maximum:"+MAX_VOL+"\n\n"
                + "info == returns url of song playing\n\n"
                + "ls || list == displays the names of the songs on the queue\n\n"
                + "try again == restats the stream (use when bot just for some odd reason wont play)\n\n"
                + "kill queue == kills the queue(includes current song playing)\n\n"
                + "playlists == displays the playlists available\n\n"
                //+ "add Playlist_Name Search_Request/YouTube_URL == will add the search request to the playlist after asking for a confirmation on the search result.\n\n"
                //+ "delete Playlist_Name Key_Word/Phrase == will remove all songs with Key_Word/Phrase upon confirmation.\n\n"
                + "```");
    }

    //play command
    if(msg.startsWith("play ")) {
        if(message.member.voiceChannelID) { //if in a voice channel
            var linkcallback = (link) => {
                getUTubeTitle(link,(title) => {
                    var song = new Song(link,title)
                    queue.push(song);

                    message.member.voiceChannel.join()
                    .then(connection =>{
                        //message.channel.send("OwO has arrived");
                        connectionGlobal = connection
                        Play(connectionGlobal,message.guild);
                    }).catch(console.log); 
                });
            };

            //if link requested
            if(msg.substring(msg.indexOf(" ")+1).includes(YOUTUBE_URL_VIDEO)){
                var link = msg.substring(msg.indexOf(" ")+1);
                linkcallback(link);
            }
            else
                getUTubeURL(msg.substring(msg.indexOf(" ")+1), 1, linkcallback);
        }
        else {
            message.channel.send("Get in a voice channel and try again.");
        }
    }

    //skips song playing
    if(msg == "skip"){
        if(connectionGlobal.dispatcher){
            connectionGlobal.dispatcher.end();
            Play(connectionGlobal,message.guild);
        }
    }
    
    //pauses stream
    if(msg == "pause"){
        if(connectionGlobal.dispatcher.paused)
            message.channel.send("It's already paused. >//<");
        else
            connectionGlobal.dispatcher.pause();
    }

    //resusmes stream
    if(msg == "play"){
        if(connectionGlobal)
            if(!connectionGlobal.dispatcher.paused)
                message.channel.send("It's already playing. >//<");
            else
                connectionGlobal.dispatcher.resume();
    }

    //sets volume to requested number with bounds of 0 and MAX_VOL
    if(msg.startsWith("vol:")){
        var vol = msg.substring(4);
        if(vol>=0 && vol<=MAX_VOL) {
            volume = vol;
            updateVol();
        }
        else    
            message.channel.send("Pick a valid number (0-"+MAX_VOL+")");
    }

    //resets volume to Initial volume level
    if(msg == "volreset"){
        volume = INIT_VOL;
        updateVol();
    }

    //sets volume to max
    if(msg == "volmax" || msg == "crank it"){
        volume = MAX_VOL;
        updateVol();
    }

    //sends url of playing song to channel
    if(msg == "info")
        if(queue[0])
            message.channel.send(queue[0].url);
        else
            message.channel.send("There is nothing playing >//<");
    
    //displays the queue
    if(msg == "ls" || msg == "list"){
        if(queue[0]) {
            let list = "";
            for(let i = 0; i < queue.length; i++)
               list += i + ": " + queue[i].name + "\n";
            message.channel.send(list);
        }
        else
            message.channel.send("There is nothing playing >//<");
    }

    //disconnects from the stream, kills the queue, and then restarts stream with the original queue
    //this is meant for when the stream fails to play the song
    if(msg == "try again"){
        var tempQ = [];
        for(let i = 0; i < queue.length; i++)
            tempQ[i] = new Song(queue[i].url,queue[i].name);
        
        queue = [];
        connectionGlobal.dispatcher.end();
        message.member.voiceChannel.join()
            .then(connection => {
                for(let i = 0; i < tempQ.length; i++)
                    queue[i] = new Song(tempQ[i].url,tempQ[i].name);
                connectionGlobal = connection;
                Play(connectionGlobal,message.guild);
            }).catch(console.log);
    }

    //kills the queue
    if(msg == "kill queue") {
        queue = [];
        if(connectionGlobal)
            if(connectionGlobal.dispatcher)
                connectionGlobal.dispatcher.end();
    }

    //search command
    if(msg.startsWith("search") && msg.includes(':')){
        var search = msg.substring(msg.indexOf(":")+1);
        let numURLs = 1;
        let vidRequest = msg.substring(6,msg.indexOf(":"));
        while(vidRequest.includes(' ')) //removes whitespace from request
            vidRequest = vidRequest.replace(' ',"");
        //processing search request for number of videos
        if(vidRequest != ""){
            if(parseInt(vidRequest) != NaN)
                if(parseInt(vidRequest)<1) {
                    message.channel.send("The number of searchs mush be greater than 0.  The search has been set to 1");
                }
                else if(parseInt(vidRequest)>MAX_VIDS) {
                    message.channel.send("The number of searchs cannot exceed "+MAX_VIDS+".  The search has been reduced to the max of "+MAX_VIDS+".");
                    numURLs = MAX_VIDS;
                }
                else
                    numURLs = parseInt(vidRequest);
            else
                message.channel.send("Invalid search request.  The search has been set to 1.");
        }
        var urlString = "";
        getUTubeURL(search,numURLs,(urlString)=> {
            message.channel.send(urlString);
        });
    }

    //displays the playlists available
    if(msg == "playlists") { 
        let pylsStr = "Playlists:\n";
        fs.readdir(PLAYLS_DIR, (err, files) => { 
            files.forEach(file => {
                pylsStr += file.substring(0,file.indexOf('.'));
            });
            if(pylsStr == "Playlists:\n")
                pylsStr = "Im sorry, no playlists are available.  Please create a new playlist with the command `new playlist Playlist_Name`"; 
            message.channel.send(pylsStr);
        });
    }

    if(msg.startsWith("add ") || msg.startsWith("delete ")) {
        let found = false;
        let pyls = msg.substring(msg.indexOf(' ')+1);

        pyls = pyls.substring(0,pyls.indexOf(' '));
        if(pyls) { //will be false if no space is after the first space
            fs.readdir(PLAYLS_DIR, (err, files) => { 
                files.forEach(file => {
                    if(pyls + ".txt" == file)
                        found = true;  
                });
                if(found)
                    fs.readFile(PLAYLS_DIR+pyls+".txt", function(err, data) {
                        if(err) throw err;
                        //console.log(data.toString());
                        //request = msg.substring(msg.indexOf(pyls)+pyls)
                    })
                else
                    message.channel.send("Im sorry, but the playlist: "+pyls+" could not be found.  Please try the command `playlists` to see available playlists.");
            });
        }
        else
            message.channel.send("Invallid command. See `help` for information on the commands");
    }
 }

 ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

 function Play(connection,guild) {
    if(!playing && queue[0]) {
        playing = true;
        guild.me.setNickname(queue[0].name.substring(0,32));
        let stream = ytdl(queue[0].url,{filter: "audioonly"})
        connection.playStream(stream);
        updateVol();
        connection.dispatcher.on('end',() => {
            playing = false;
            queue.shift();
            if(queue[0])
                Play(connection,guild);
            else {
                connection.disconnect();
                bot.user.setActivity("");
                guild.me.setNickname("");
            }
        });
    } 
}

 ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

 //search must be a string and address an array of strings for urls of atleast size numURLs
 //urls will be returned in address with the first youtube vid url
 //urls do not include ads or playlists
 //recommended that address not be initalized with a size more than 15 because the search is at max 20 urls, but ads and playlists will be skipped
 function getUTubeURL(search,numURLs,callback){

    var address = new Array(numURLs)

    while(search.includes(" ")) //Replaces all of the spaces in the search request with '+'
        search = search.substring(0,search.indexOf(" "))+"+"+search.substring(search.indexOf(" ")+1);

    rp(YOUTUBE_URL_SEARCH+search)
        .then( function(htmlString) {
            //console.log(htmlString)
            var end = false;
            let x = 0;
            while((!end)&&(x<numURLs)){
                if(htmlString.indexOf(HTML_URL_INDEX)!=-1){ //-1 if not found
                    htmlString = htmlString.substring(200);
                    htmlString = htmlString.substring(htmlString.indexOf(HTML_URL_INDEX));
                    address[x] = htmlString.substring(htmlString.indexOf("id=")+4, htmlString.indexOf("\" ",htmlString.indexOf("id=")));
                    x++;
                }
                else{
                    end = true;
                    console.log("ERROR: To many urls requested or invalid search");
                    console.log(x+" urls have been returned");
                }
            }
            numURLs = x;

            var urlString = ""; //turns array of urls into one string to send, to allow for smoother output.
    
            for(var i = 0; i < numURLs; i++)
                urlString += YOUTUBE_URL_VIDEO+address[i]+"\n";

            callback(urlString)
        })
        .catch(function (err) {
            console.log("there was an colossal url oopsies");
        });
 }

 ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
 function getUTubeTitle(link,callback) {
    //console.log('!'+link);
    rp(link)
        .then( function(htmlString) {
            htmlString = htmlString.substring(htmlString.indexOf('<title>')+7,htmlString.indexOf(" - YouTube</title>",htmlString.indexOf("<title>")));
            //console.log(htmlString);
            // & conversion
            while(htmlString.indexOf('&amp;') >= 0) //-1 if not found
                htmlString = htmlString.replace('&amp;','&');   // &amp = &

            // " conversion
            while(htmlString.indexOf('&quot;') >= 0)
                htmlString = htmlString.replace('&quot;',"\"");

            // ' conversion
            while(htmlString.indexOf('&#39;') >= 0) 
                htmlString = htmlString.replace('&#39;',"\'");  // &#39 = '

            // \ conversion
            while(htmlString.indexOf('\\') >= 0) 
                htmlString = htmlString.replace('\\',"~bksh~");   // \ = \\
            while(htmlString.indexOf('~bksh~') >= 0)
                htmlString = htmlString.replace('~bksh~','\\\\') 
            
            // * conversion
            while(htmlString.indexOf('*') >= 0 && htmlString.indexOf) 
                htmlString = htmlString.replace('*',"~star~");   // * = \*
            while(htmlString.indexOf('~star~') >= 0)
                htmlString = htmlString.replace('~star~','\\*');

            callback(htmlString);
        }) .catch(function (err) {
            console.log("there was a slight naming oopsies");
            console.log(err);
        });
 }
 ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

 function updateVol(){
    connectionGlobal.dispatcher.setVolume(volume/100);
    bot.user.setActivity("vol:"+volume);
    return;
 }

bot.login(TOKEN);