"use strict";
 const Discord = require('discord.js')

 const fs = require('fs')
 let jsonData = JSON.parse(fs.readFileSync('settings.json', 'utf-8'))
 const TOKEN = jsonData.token;

 const bot = new Discord.Client();
 const BOT_ID = '541338820772233231';
 const MAX_VIDS = 5;
 const MAX_VOL = 100; //vol can go as high or low as desired, however anything other than 100 will distort the sound.  1000 sounds extremely distorted
 const INIT_VOL = 25;
 const YOUTUBE_URL_VIDEO = "https://www.youtube.com/watch?v=";
 const YOUTUBE_URL_SEARCH = "https://www.youtube.com/results?search_query=";
 const TEST_CHANNEL_ID = jsonData.test_channel_id;
 const MUSIC_CHANNEL_ID = jsonData.command_channel_id;

 const HTML_URL_INDEX = "<li><div class=\"yt-lockup yt-lockup-tile yt-lockup-video vve-check clearfix\" data-context-item-id=\""
 const PYLS_DIR = "./playlists/";
 var volume = INIT_VOL;
 var queue = [];
 var playing = false;
 var ytdl = require('ytdl-core');
 var connectionGlobal;
 var rp = require('request-promise');

 ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
 //Commands
 const HELP = "help";
 const SEARCH = "search";
 const PLAY = "play";
 const SKIP = "skip";
 const RESUME = "play";
 const VOLUME = "vol";
 const VOLUME_RESET = "volreset";
 const VOLUME_MAX = "volmax";
 const SONG_INFO = "info";
 const LIST_QUEUE = "list";
 const RESET_STREAM = "try again";
 const DELETE_QUEUE = "kill queue";
 const LIST_PLAYLISTS = "playlists";
 const CREATE_PLAYLIST = "touch playlist";
 const DELETE_PLAYLIST = "rm";
 const ADD_TO_PLAYLIST = "add";
 const REMOVE_SONG_FROM_PLAYLIST = "delete";
 const LOAD_PLAYLIST = "add";
 const DISPLAY_SONGS_IN_PLAYLIST = "ls";

 ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
 //POTENTIAL ADD-ONS and problems
 //cant play mature content
 //cant play streams/live videos
 //rotating queue: will play one song from someone, then the next is from someone else
 //option to normal queueing or rotating queueing
 ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

 class Song {
    constructor(url,name,dur) {
        this.url = url;
        this.name = name;
        this.dur = dur
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
    if(message.member.permissions.has('ADMINISTRATOR')) {
        if(message.content.startsWith('kill') && message.content.includes('@'+BOT_ID)) {
            message.channel.send("Terminating Program Tort\nGoodbye OwO");
            setTimeout(function() {
                process.exit(1);
            }, 85);
        }
    }

    //music commands
    if(message.channel.id == MUSIC_CHANNEL_ID || message.channel.id == TEST_CHANNEL_ID ) {
        musicCommand(message);
    }
 })

 ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

 function musicCommand(message) {
    //help command
    var msg = message.content.toLowerCase(); //removes case sensitivity
    var command = message.content.split(" "); //array of the commands split where spaces are present.

    if(msg == "help") {
        message.channel.send("```"
                + "help == displays list of commands\n\n"
                + "search Search_Request == returns the top result of the search request from YouTube\n\n"
                + "search# Search_Request == returns top results of search request from YouTube [1 < # < "+MAX_VIDS+"]\n\n"
                + "play Search_Request/YouTube_URL == adds the first seach result or url to the queue and begins queue if not already playing\n\n"
                + "skip == skips the current song in queue\n\n"
                + "play == unpauses the stream if paused\n\n"
                + "pause == pauses the stream if playing\n\n"
                + "vol # == sets the volume of the number inputed. [0 < # < "+MAX_VOL+"]\n\n"
                + "volreset == resests the volume to the initial volume:"+INIT_VOL+"\n\n"
                + "volmax == sets the volume to the maximum:"+MAX_VOL+"\n\n"
                + "info == returns url of song playing and time remaining\n\n"
                + "ls/list == displays the names of the songs on the queue\n\n"
                + "try again == restats the stream (use when bot just for some odd reason wont play)\n\n"
                + "kill queue == kills the queue(includes current song playing)\n\n"
                + "playlists == displays the playlists available\n\n"
                + "touch Playlist_Name == makes a new playlist\n\n"
                + "rm Playlist_Name == deletes the playlist (can only be done by creator of the playlist)\n\n"
                + "add Playlist_Name Search_Request/YouTube_URL == will add the search request to the playlist\n\n"
                + "delete Playlist_Name Key_Words/Youtube_URL == will remove all songs with Key_Words/url\n\n"
                + "load Playlist_Name == the playlist will be randomly added to the queue\n\n"
                + "ls/list Playlist_Name == displays all songs from the playlist\n\n"
                + "```");
    }


    if(command[0].includes("beep")) {
        console.log(connectionGlobal.dispatcher.speaking);
    }

    //search command
    if(command[0].toLowerCase().includes(SEARCH)) {
        var search = msg.substring(msg.indexOf(" ")+1);
        let numURLs = 1;
        let vidRequest = msg.substring(SEARCH.length,msg.indexOf(" "));
        console.log(vidRequest);
        //processing search request for number of videos
        if(vidRequest != "") {
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
        getYouTubeURL(search,numURLs,(urlString)=> {
          message.channel.send(urlString);
        });
    }

    //play command
    if(command[0].toLowerCase() == "play" && command[1]) {
        if(message.member.voice.channelID) { //if in a voice channel
            var linkcallback = (link) => {
                getYouTubeTitle(link,(title) => {
                    var song = new Song(link,title)
                    queue.push(song);

                    message.member.voice.channel.join()
                    .then(connection => {
                        //message.channel.send("OwO has arrived");
                        connectionGlobal = connection;
                        Play(connectionGlobal,message.guild);
                    }).catch(console.log);
                });
            };

            if(command[1].includes(YOUTUBE_URL_VIDEO))      //if link requested
                linkcallback(command[1]);
            else                                            //if search requested
                getYouTubeURL(msg.substring(msg.indexOf(" ")+1), 1, linkcallback);
        }
        else {
            message.channel.send("Get in a voice channel and try again.");
        }
    }

    //skips song playing
    if(msg == "skip") {
        if(connectionGlobal.dispatcher) {
            connectionGlobal.dispatcher.end();
            Play(connectionGlobal,message.guild);
        }
    }

    //resusmes stream
    if(msg == "play") {
        if(connectionGlobal && connectionGlobal.dispatcher)
            if(!connectionGlobal.dispatcher.paused)
                message.channel.send("It's already playing. >//<");
            else
                connectionGlobal.dispatcher.resume();
        else
            message.channel.send("Something must be playing for me to play it");
    }

    //pauses stream
    if(msg == "pause") {
        if(connectionGlobal && connectionGlobal.dispatcher)
            if(connectionGlobal.dispatcher.paused)
                message.channel.send("It's already paused. >//<");
            else
                connectionGlobal.dispatcher.pause();
        else
            message.channel.send("Something must be playing for me to pause it");
    }

    //sets volume to requested number with bounds of 0 and MAX_VOL
    if(command[0].toLowerCase() == "vol") {
        if(command[1] >= 0 && command[1] <= MAX_VOL) {
            volume = command[1];
            updateVol(connectionGlobal);
        }
        else
            message.channel.send("Pick a valid number (0-"+MAX_VOL+")");
    }

    //resets volume to Initial volume level
    if(msg == "volreset") {
        volume = INIT_VOL;
        updateVol(connectionGlobal);
    }

    //sets volume to max
    if(msg == "volmax" || msg == "crank it") {
        volume = MAX_VOL;
        updateVol(connectionGlobal);
    }

    //sends url of playing song to channel
    if(msg == "info")
        if(queue[0]) {
            console.log(connectionGlobal.dispatcher.time);
            message.channel.send(queue[0].url);
        }
        else
            message.channel.send("There is nothing playing >//<");

    //displays the queue
    if(msg == "ls" || msg == "list") {
        if(queue[0]) {
            let list = "";
            for(let i = 0; i < queue.length; i++)
               list += i + ": " + queue[i].name + "\n";
            bigPrint(list, (arr) => {
                for(let i = 0; i < arr.length; i++)
                    message.channel.send(arr[i]);
            });
        }
        else
            message.channel.send("There is nothing playing >//<");
    }

    //disconnects from the stream, kills the queue, and then restarts stream with the original queue
    //this is meant for when the stream fails to play the song
    if(msg == "try again") {
        var tempQ = [];
        for(let i = 0; i < queue.length; i++)
            tempQ[i] = new Song(queue[i].url,queue[i].name);

        queue = [];
        connectionGlobal.dispatcher.end();
        message.member.voice.channel.join()
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
            if(connectionGlobal.dispatcher) {
                connectionGlobal.dispatcher.end();
                message.channel.send("Queue has been killed");
            }
    }

    //displays the playlists available
    if(msg == "playlists") {
        let pylsStr = "Playlists:\n";
        fs.readdir(PYLS_DIR, (err, files) => {
            files.forEach(file => {
                pylsStr += file.substring(0,file.indexOf('.'));
            });
            if(pylsStr == "Playlists:\n")
                pylsStr = "Im sorry, no playlists are available.  Please create a new playlist with the command `touch Playlist_Name`";
            message.channel.send(pylsStr);
        });
    }

    //creating playlists
    if(command[0].toLowerCase() == "touch") {
        fs.readdir(PYLS_DIR, (err, files) => {
            var found = false;
            files.forEach(file => {
                if(command[1].toLowerCase() + ".txt" == file)
                    found = true;
            });
            if(found)
                message.channel.send("There is already a playlist named: "+command[1].toLowerCase());
            else {
                fs.writeFile(PYLS_DIR+command[1].toLowerCase()+".txt",message.author.id+"\n",(err) => {
                    if(err) throw err;
                    message.channel.send("Playlist: "+command[1]+" has been created")
                })
            }
        });
    }

    //deleting playlists
    if(command[0].toLowerCase() == "rm") {
        fs.readdir(PYLS_DIR, (err, files) => {
            var found = false;
            files.forEach(file => {
                if(command[1].toLowerCase() + ".txt" == file)
                    found = true;
            });
            if(!found)
                message.channel.send("There is no playlist named: "+command[1].toLowerCase());
            else {
                fs.readFile(PYLS_DIR+command[1].toLowerCase()+".txt", function(err, data) {
                    let ownerID = data.toString().substring(0,data.toString().indexOf("\n"))
                    if(ownerID == message.author.id || message.member.permissions.has('ADMINISTRATOR')) {  //checks if the person deleting is the creator of the playlist or the admin
                        fs.unlink(PYLS_DIR+command[1].toLowerCase()+".txt",(err) => {
                            if(err) throw err;
                            message.channel.send("Playlist: "+command[1]+" has been deleted");
                        });
                    }
                    else
                        console.log("You do not have permission to delete this playlist");
                });
            }
        });
    }

    //editing playlists
    if(command[0].toLowerCase() == "add" || command[0].toLowerCase() == "delete") {
        let found = false;
        //let command = msg.split(" "); //array of the commands split where spaces are present.
        if(command[1]) {
            fs.readdir(PYLS_DIR, (err, files) => {
                files.forEach(file => {
                    if(command[1].toLowerCase() + ".txt" == file)
                        found = true;
                });
                if(found)
                    fs.readFile(PYLS_DIR+command[1].toLowerCase()+".txt", function(err, data) {
                        if(err) {
                            console.log(err);
                            throw err;
                        }
                        if(command[2]) {
                            var search = "";
                            for(let i = 2; i < command.length; i++)
                                search += command[i]+ (i+1 == command.length?"":" ");
                            if(command[0].toLowerCase() == "add") {             //adding songs to playlists
                                var linkcallback = (link) => {
                                    getYouTubeTitle(link,(title) => {
                                        if(!data.toString().includes(link)) {
                                            fs.appendFile(PYLS_DIR+command[1].toLowerCase()+".txt", title+";"+link, (err) => {
                                                if(err) throw err;
                                                message.channel.send(link + "has been added to the playlist: " + command[1].toLowerCase());
                                            });
                                        }
                                        else
                                            message.channel.send("that link is already on the playlist: " + command[1].toLowerCase());
                                    });
                                }
                                if(search.includes(YOUTUBE_URL_VIDEO))      //links
                                   linkcallback(search);
                                else                                        //search request
                                    getYouTubeURL(search, 1, linkcallback);
                            }
                            else if(command[0].toLowerCase() == "delete") {     //removing songs from playlist
                                let songs = data.toString().substring(data.toString().indexOf("\n")+1).split("\n");
                                let list = "";
                                let listRM = "";
                                if(command[2].includes(YOUTUBE_URL_VIDEO)) {    //links
                                    songs.forEach(song => {
                                        if(song.substring(song.indexOf(';')) == command[2])
                                            listRM += song;
                                        else
                                            list += song;
                                    });
                                }
                                else {                                      //keywords
                                    songs.forEach(song => {
                                        if(!song.substring(0,song.indexOf(';')).toLowerCase().includes(search.toLowerCase()))
                                            list += song+"\n";
                                        else
                                            listRM += song.substring(song.indexOf(';')+1)+"\n";
                                    });
                                }
                                fs.writeFile(PYLS_DIR+command[1].toLowerCase()+".txt",data.toString().substring(0,data.toString().indexOf("\n"))+list,(err) => {
                                        if(err) throw err;
                                        if(listRM)
                                            message.channel.send("the song(s) deleted are as follows:\n"+listRM);
                                        else
                                            message.channel.send("no songs were found from request: "+command[2]);
                                });
                            }
                        }
                        else
                            message.channel.send("Invallid command. See `help` for information on the commands")
                    })
                else
                    message.channel.send("Im sorry, but the playlist: "+command[1].toLowerCase()+" could not be found.  Please try the command `playlists` to see available playlists.");
            });
        }
        else
            message.channel.send("Invallid command. See `help` for information on the commands");
    }

    if(command[0].toLowerCase() == "load") {
        if(command[1]) {
            fs.readdir(PYLS_DIR, (err, files) => {
                let found = false;
                files.forEach(file => {
                    if(command[1].toLowerCase()+".txt" == file)
                        found = true;
                });
                if(found) {
                    if(message.member.voice.channelID) { //if in a voice channel
                        fs.readFile(PYLS_DIR+command[1].toLowerCase()+".txt", function(err, data) {
                            let songs = data.toString().substring(data.toString().indexOf("\n")+1).split("\n");
                            shuffle(songs);
                            songs.forEach(song => {
                                var vid = new Song(song.substring(song.indexOf(';')+1),song.substring(0,song.indexOf(';')));
                                queue.push(vid);
                            });
                            message.member.voice.channel.join()
                            .then(connection => {
                                connectionGlobal = connection;
                                Play(connectionGlobal,message.guild);
                            }).catch(console.log);
                        });
                    }
                    else { 
                        message.channel.send("Get in a voice channel and try again.");
                    }
                }
                else
                    message.channel.send("There is no playlist named: "+command[1].toLowerCase());
            });
        }
        else
            message.channel.send("Invallid command. See `help` for information on the commands");
    }

    if(command[0].toLowerCase() == "ls" || command[0].toLowerCase() == "list") {
        if(command[1]) {
            fs.readdir(PYLS_DIR, (err, files) => {
                let found = false;
                files.forEach(file => {
                    if(command[1].toLowerCase()+".txt" == file)
                        found = true;
                });
                if(found) {
                    fs.readFile(PYLS_DIR+command[1].toLowerCase()+".txt", function(err, data){
                        let songs = data.toString().substring(data.toString().indexOf("\n")+1).split("\n");
                        let nameStr = "";
                        let nameArr = [];
                        songs.forEach(song => {
                            nameStr += song.substring(0,song.indexOf(';'))+"\n";
                        });
                        bigPrint(nameStr, (arr) => {
                            message.channel.send("Songs:\n"+arr[0]);
                            for(let i = 1; i < arr.length; i++)
                                message.channel.send(arr[j]);
                        });
                    });
                }
                else
                    message.channel.send("Im sorry, but the playlist: "+command[1].toLowerCase()+" could not be found.  Please try the command `playlists` to see available playlists.");
            });
        }
    }
 }

 ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

 function Play(connection,guild) {
    if(!playing && queue[0]) {
        playing = true;
        guild.me.setNickname(queue[0].name.substring(0,32));
        let stream = ytdl(queue[0].url,{filter: "audioonly"})
        connection.play(stream);
        updateVol(connection);
        connection.dispatcher.on('finish',() => {
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
 function getYouTubeURL(search,numURLs,callback) {

    var address = new Array(numURLs)

    while(search.includes(" ")) //Replaces all of the spaces in the search request with '+'
        search = search.substring(0,search.indexOf(" "))+"+"+search.substring(search.indexOf(" ")+1);

    rp(YOUTUBE_URL_SEARCH+search)
        .then( function(htmlString) {
            //console.log(htmlString)
            var end = false;
            let x = 0;
            while((!end)&&(x<numURLs)) {
                if(htmlString.indexOf(HTML_URL_INDEX)!=-1) { //-1 if not found
                    htmlString = htmlString.substring(200);
                    htmlString = htmlString.substring(htmlString.indexOf(HTML_URL_INDEX));
                    address[x] = htmlString.substring(htmlString.indexOf("id=")+4, htmlString.indexOf("\" ",htmlString.indexOf("id=")));
                    x++;
                }
                else {
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

//<span class="video-time" aria-hidden="
/*
Tokyo Ghoul - Glassy Sky [東京喰種 -トーキョーグール-]</a></li><li class="yt-lockup-p
laylist-item clearfix"><span class="yt-lockup-playlist-item-length"><span aria-label=" 4:55

ME!ME!ME! - Daoko feat. TeddyLoid (Original) (1440p)</a></li><li class="yt-lockup-p
laylist-item clearfix"><span class="yt-lockup-playlist-item-length"><span aria-label="

Playlist</span></h3><div class="yt-lockup-byline ">YouTube</div><ol class="yt-lockup-meta yt-lockup-playlist-items"><li class="yt-lockup-playlist-item clearfix"><span class="yt-lockup-playlist-item-length"><span aria-label="

*/


 ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
 function getYouTubeTitle(link,callback) {
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

 function updateVol(connection) {
    if(connection && connection.dispatcher) { //will not update the volume if the connection and or dispatcher are undefined
        connection.dispatcher.setVolume(volume/100);
        bot.user.setActivity("vol:"+volume);
    }
    return;
 }

 ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

 //shuffles the queue of songs
 function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return;
 }

 ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

 function bigPrint( str, callback) {
    let smallEnough = false; // = (nameStr.length < 1990) //discord has a 2000 word maximum per message
    let i = 0;
    let strArr = [];
    do {
        if(str.length > 1990) {
            let goodsize = false;
            strArr[i] = "";
            while(!goodsize)
                if(strArr[i].length + str.indexOf("\n") < 1990) {
                    strArr[i] += str.substring(0,str.indexOf("\n")+1)
                    str = str.substring(str.indexOf("\n")+1);
                }
                else {
                    goodsize = true;
                    i++;
                }
        }
        else {
            strArr[i] = str;
            smallEnough = true;
            i++;
        }
    } while (!smallEnough);
    callback(strArr);
    return;
 }

 ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

 bot.login(TOKEN);
