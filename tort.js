 "use strict";
 const Discord = require('discord.js')
 const bot = new Discord.Client();
 const TOKEN = 'NTQxMzM4ODIwNzcyMjMzMjMx.DzfPZQ.YygmmoKMCeYgD2fcOY0mca6QNX8';
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
 const HTML_NAME_INDEX = "class=\"yt-uix-tile-link yt-ui-ellipsis yt-ui-ellipsis-2 yt-uix-sessionlink"
 var last_played="";
 var volume = INIT_VOL;
 var queue = [];
 var playing = false;
 //var request = require("request");
 var ytdl = require('ytdl-core');
 var connectionGlobal;

 ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
 //POTENTIAL ADD-ONS
 //soundcloud compatability
 //rotating queue: will play one song from someone, then the next is from someone else
 //playlists: probably files with links in them and potentially a way to update said playlists
 //kill queue command: will kill the entire queue or specific person's queue
 //option to normal queueing or rotating queueing
 //add add command seperate from play
 //add display queue command
 //potentially find out why it sometimes doesn't work
 ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

 function Song() {
    var url;
    var name;
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
    if(message.content == "help") {
        message.channel.send("```help == displays list of commands\n\n"
                + "search:Search_Request == returns the top result of the search request from YouTube\n\n"
                + "search#:Search_Request == returns top results of search request from YouTube [1 < # < "+MAX_VIDS+"]\n\n"
                + "play:Search_Request == will find the first YouTube result and play that in the music voice channel\n\n"
                + "play:YouTube_URL == will play the YouTube video in the music voice channel\n\n"
                + "play == unpauses the stream if paused\n\n"
                + "pause == pauses the stream if playing\n\n"
                + "skip == skips the current song in queue\n\n"
                + "vol:# == sets the volume of the number inputed. [0 < # < "+MAX_VOL+"]\n\n"
                + "volreset == resests the volume to the initial volume:"+INIT_VOL+"\n\n"
                + "volmax == sets the volume to the maximum:"+MAX_VOL+"\n\n```");
    }

    //play command
    if(message.content.startsWith("play:")) {
        if(message.member.voiceChannelID) {
            //play given link
            var linkcallback = (link)=>{
                queue.push(link);
                message.member.voiceChannel.join()
                .then(connection =>{
                    //message.channel.send("OwO has arrived");
                    connectionGlobal = connection
                    Play(connectionGlobal);
                }).catch(console.log); 
            };
            
            if(message.content.substring(message.content.indexOf(":")+1).includes(YOUTUBE_URL_VIDEO)){
                var link = message.content.substring(message.content.indexOf(":")+1);
                linkcallback(link);
            }

            // //request last song played
            // else if(message.content.substring(message.content.indexOf(":")+1) == 'last')
            //     if(last_played)
            //         link = last_played;
            //     else {
            //         message.channel.send("Please request a song before asking for the last one played")
            //         return;
            //     }
                    
            //search then play search result
            else
                getUTubeURL(message.content.substring(message.content.indexOf(":")+1), 1, linkcallback);
        }
        else {
            message.channel.send("Get in a voice channel and try again.");
        }
    }

    if(message.content == "skip"){
        if(connectionGlobal.dispatcher){
            connectionGlobal.dispatcher.end();
            Play(connectionGlobal);
        }
    }
    
    if(message.content == "pause"){
        if(connectionGlobal.dispatcher.paused)
            message.channel.send("It's already paused. >//<");
        else
            connectionGlobal.dispatcher.pause();
    }

    if(message.content == "play"){
        if(!connectionGlobal.dispatcher.paused)
            message.channel.send("It's already playing. >//<");
        else
            connectionGlobal.dispatcher.resume();
    }

    if(message.content.startsWith("vol:")){
        var vol = message.content.substring(4);
        if(vol>=0 && vol<=MAX_VOL) {
            volume = vol;
            updateVol();
        }
        else    
            message.channel.send("Pick a valid number (0-"+MAX_VOL+")");
    }

    //resets volume to Initial volume level
    if(message.content == "volreset"){
        volume = INIT_VOL;
        updateVol();
    }

    if(message.content == "volmax"){
        volume = MAX_VOL;
        updateVol();
    }

    //search command
    if(message.content.startsWith("search") && message.content.includes(':')){
        var search = message.content.substring(message.content.indexOf(":")+1);
        let numURLs = 1;
        let vidRequest = message.content.substring(6,message.content.indexOf(":"));
        while(vidRequest.includes(' ')) //removes whitespace from request
            vidRequest = vidRequest.replace(' ',"");
        //processing search request for number of videos
        if(vidRequest != ""){
            if(parseInt(vidRequest) != NaN)
                if(parseInt(vidRequest)<1) {
                    message.channel.send("The number of searchs mush be greater than 0.  The search has been set to 1")
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
        getUTubeURL(search,numURLs,(urlString)=>{
            message.channel.send(urlString);
        });
    }
 }

 ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

 function Play(connection) {
    if(!playing && queue[0]) {
        playing = true;
        last_played = queue[0];
        let stream = ytdl(queue.shift(),{filter: "audioonly"})
        connection.playStream(stream);
        updateVol();
        connection.dispatcher.on('end',() => {
            playing = false;
            if(queue[0])
                Play(connection);
            else {
                connection.disconnect();
                bot.user.setActivity("");
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
    var title = new Array(numURLs) 
    //address[0] = "";

    while(search.includes(" ")) //Replaces all of the spaces in the search request with '+'
        search = search.substring(0,search.indexOf(" "))+"+"+search.substring(search.indexOf(" ")+1);

    var rp = require('request-promise');
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
                    
                    htmlString = htmlString.substring(htmlString.indexOf(HTML_NAME_INDEX));
                    title[x] = htmlString.substring(htmlString.indexOf("title=")+7, htmlString.indexOf("\" ",htmlString.indexOf("title=")));
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
            console.log("there was an oopsies");
        });
 }

 ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

 function updateVol(){
    connectionGlobal.dispatcher.setVolume(volume/100);
    bot.user.setActivity("vol:"+volume);
    return;
 }

bot.login(TOKEN);