String.prototype.replaceAll = String.prototype.replaceAll || function(needle, replacement) {
    return this.split(needle).join(replacement);
};

require('ssl-root-cas');

const currentTrainningName = 'currentTrainning';
const bucketName = 'mydrills';

const msg = require('./texts');


var AWS = require('aws-sdk');
AWS.config.update({region: 'us-west-2'});
s3 = new AWS.S3({apiVersion: '2006-03-01'});


const express = require('express');



const { ExpressAdapter } = require('ask-sdk-express-adapter');
const Alexa = require('ask-sdk-core');
const persistenceAdapter = require('ask-sdk-s3-persistence-adapter');

const app = express();

app.use(express.static('public'));


var lang = "en";
const LanguageInterceptor = {
    process(handlerInput) {
        try{
            console.log("Interecpt: ")
            console.log("Interecpt: " + handlerInput.requestEnvelope.request.locale)
            lang = handlerInput.requestEnvelope.request.locale.substring(0,2);
            console.log("lang : " + lang);
            console.log("handlerInput.requestEnvelope.request.type: " + handlerInput.requestEnvelope.request.type)
            if(handlerInput.requestEnvelope.request.intent) {
                console.log("handlerInput.requestEnvelope.request.intent.name: " + handlerInput.requestEnvelope.request.intent.name)    
            }
            
        } catch (error) {
            console.log("error:")
            console.log(error)
        }
    }
};


const LoadUnfinishedTrainningInterceptor = {
    async process(handlerInput) {
        
        var sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        var currentTrainning = sessionAttributes.currentTrainning;
    
        if(!currentTrainning) {
            const attributesManager = handlerInput.attributesManager;
            const sessionAttributes = await attributesManager.getPersistentAttributes() || {};

            currentTrainning = sessionAttributes.hasOwnProperty('currentTrainning') ? sessionAttributes.currentTrainning : 0;

            console.log("LoadUnfinishedTrainningInterceptor:")
            console.log(currentTrainning)

            if (currentTrainning) {
                attributesManager.setSessionAttributes(sessionAttributes);
            }    
        }
        
    }
};


const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
      
      
    var sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var currentTrainning = sessionAttributes.currentTrainning;
    
    var speechText = "<speak>" + msg.welcomemsg[lang] + "</speak>";
    if(currentTrainning) {
        speechText = "<speak>" + msg.welcomebackmsg[lang] + "</speak>";
        speechText = speechText.replaceAll("@@PART@@", (currentTrainning.currentdrill));
    }    
  
    return handlerInput.responseBuilder
      .speak(speechText)
      .withShouldEndSession(false)
      .getResponse();
  }
};


const ChoseTrainningIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'ChoseTrainningIntent';
  },
  async handle(handlerInput) {
    const type = handlerInput.requestEnvelope.request.intent.slots.type.value;
    const level = handlerInput.requestEnvelope.request.intent.slots.level.value;
      
    const deviceId = Alexa.getDeviceId(handlerInput.requestEnvelope);  
    console.log("deviceId: " + deviceId)  
    
    var sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var currentTrainning = sessionAttributes.currentTrainning;
    
   // if(currentTrainning) {
//        const speechText = nextDrillIntentIntent(handlerInput, ShouldEndSession);
  //  } else {
        const speechText = await choseTrainningIntent(handlerInput,level, type);
//    }
      
    console.log("speechText: " + speechText)  
    return handlerInput.responseBuilder
      .speak(speechText)
      .withShouldEndSession(false)
      .getResponse();
  }
};

const NextDrillIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'NextDrillIntent';
  },
  handle(handlerInput) {
    var ShouldEndSession = false;
    const speechText =  nextDrillIntentIntent(handlerInput, ShouldEndSession);
    return handlerInput.responseBuilder
      .speak(speechText)
      .withShouldEndSession(ShouldEndSession)
      .getResponse();
  }
};


const StartCurrentDrillHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'StartCurrentDrillIntent';
  },
  handle(handlerInput) {
    
    const speechText = startCurrentDrillIntent(handlerInput);
    return handlerInput.responseBuilder
      .speak(speechText)
      .withShouldEndSession(false)
      .getResponse();
  }
};



const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speechText = msg.helpmsg[lang];

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse();
  }
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  async handle(handlerInput) {
      
    const attributesManager = handlerInput.attributesManager;
    
    var sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var unfinishedTrainning = {"currentTrainning":sessionAttributes.currentTrainning};  
    
    attributesManager.setPersistentAttributes(unfinishedTrainning); 
    await attributesManager.savePersistentAttributes();  
      
      
    const speechText = msg.byemsg[lang];

    return handlerInput.responseBuilder
      .speak(speechText)
      .withShouldEndSession(true)
      .getResponse();
  }
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  async handle(handlerInput) {
    //any cleanup logic goes here
    const attributesManager = handlerInput.attributesManager;
      
    var sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var unfinishedTrainning = {"currentTrainning":sessionAttributes.currentTrainning};  
    
    attributesManager.setPersistentAttributes(unfinishedTrainning); 
    await attributesManager.savePersistentAttributes();
      
    const speechText = msg.byemsg[lang];

    return handlerInput.responseBuilder
      .speak(speechText)
      .withShouldEndSession(true)
      .getResponse();
  }
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);
    
    return handlerInput.responseBuilder
      .speak(msg.errormsg[lang])
      .reprompt(msg.errormsg[lang])
      .getResponse();
  },
};


function saveSessionTrainning(currentTrainning){
    var uploadParams = {Bucket: bucketName, Key: currentTrainningName, Body: JSON.stringify(currentTrainning)};
    s3.upload (uploadParams, function (err, data) {
      if (err) {
        console.log("Error", err);
      } if (data) {
        console.log("Upload Success", data.Location);
      }
    });
}


function speakDrills(currentTrainning, n) {
    var resp = "";
    
    try {
        for(var i = 0; i <= n; i++){
            resp += currentTrainning.trainning[i];
            if(i < n){
                resp += ". "+ msg.thenmsg[lang] +" ";  
            }
        }    
    } catch (err) {
        console.log(err);
    }
    
    return resp + ". ";
}

function nextDrillIntentIntent(handlerInput, shouldendsession){
    shouldendsession = false;
    var resptxt = "";

    var sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var currentTrainning = sessionAttributes.currentTrainning;
    currentTrainning.currentdrill += 1;
    sessionAttributes.currentTrainning = currentTrainning;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes)

    if(currentTrainning.currentdrill >= currentTrainning.trainning.length){
        resptxt = "<speak> " + msg.endmsg[lang] + "</speak>";
        shouldendsession = true;
    } else {
        resptxt = "<speak> " + msg.nextDrillmsg[lang] + "</speak>";
        resptxt = resptxt.replaceAll("@@PART@@", (currentTrainning.currentdrill + 1));
        resptxt = resptxt.replaceAll("@@MOVES@@", currentTrainning.trainning[currentTrainning.currentdrill]);
        resptxt = resptxt.replaceAll("@@FULL@@", speakDrills(currentTrainning, currentTrainning.currentdrill));
    } 
    console.log(resptxt);
    return resptxt;
}





function choseTrainningIntent(handlerInput, level, type){

    function mapCodesToMoves(trainings, lang){
        var mappedtrainning = [];
        trainings.forEach(function(t){
            var trainning = {};
            trainning = [];
            t.forEach(function(m){
                var moves = [];
                m.forEach(function(d){
                    moves.push(msg.moves[lang][d]);
                })
                trainning.push(moves);
            });
            mappedtrainning.push(trainning);
        });  
        return mappedtrainning;
    }
    
    
    function checkLevel(trainning, level){
        var count = 0;
        trainning.forEach(function(item){
            count += item.length;
        })

        var mylevel = "";
        if(count < 10 && level == "easy"){
            mylevel = "easy";
        } else if(count < 20){
            mylevel = "normal"
        } else {
            mylevel = "hard";
        }

        return mylevel == level;
    }

    function checkType(trainning, type){
        var mytype = "boxing";
        trainning.forEach(function(item){
            if(item.indexOf("kick") > 0){
                mytype = "kickboxing";   
            }
        })
        return mytype == type ;
    }
    
    //var resp = getResp();
    return new Promise(((resolve, reject) => {
        var resptxt = "";

        var bucketParams = {
            Bucket : 'mydrills',
            Key: 'drills'
        };
        s3.getObject(bucketParams, function(err, data) {
            if (err){
                console.log(err, err.stack); // an error occurred
                reject(err);
            } else {
                console.log(JSON.parse(data.Body.toString('utf-8')))
                
                
                var trainnings = mapCodesToMoves(JSON.parse(data.Body.toString('utf-8')), lang);           // successful response
                console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@xxxxxxxxxxxxxxxxxxxxx@@@@@@@@@@@@@@@@@@@@@@@@");
                console.log(trainnings);
                
                var filteredtrainnings = trainnings.filter(function(trainning){
                    return checkLevel(trainning, level) && checkType(trainning, type)
                });
                
                console.log(filteredtrainnings);
                
                if(filteredtrainnings.length <= 0){ //enquanto nao enche a base
                    filteredtrainnings = trainnings; 
                }

                var currentTrainning = {}
                var chosen = Math.floor(Math.random() * filteredtrainnings.length);
                console.log("chosen: " + chosen);
                currentTrainning.trainning = filteredtrainnings[chosen]
                currentTrainning.currentdrill = 0;
                currentTrainning.level = level;
                currentTrainning.type = type;
                

                var sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
                sessionAttributes.currentTrainning = currentTrainning;
                handlerInput.attributesManager.setSessionAttributes(sessionAttributes)

                console.log(currentTrainning.trainning[0]);
                resptxt = "<speak>" + msg.chooseDrillmsg[lang] + "</speak>"; 
                resptxt = resptxt.replaceAll("@@FULL@@", speakDrills(currentTrainning, currentTrainning.trainning.length-1));
                resptxt = resptxt.replaceAll("@@MOVES@@", currentTrainning.trainning[0]);
                resolve(resptxt);
            }
        });
    }));
}

function waitForUserMusic(minutes, drilltxt){
    var resptxt = "";
    //var breaktxt = " <break time=\"10s\"/> ";
    var breakaudio1min = " <audio src=\"https://personalfight.herokuapp.com/audio2.mp3\"/>  ";
    //var breakaudio1min = " entrei na feira da fruta a a a a  ";
    
    var motivational = msg.motivationalmsg[lang];
    
    for(var i = 1; i <= minutes; i++){
        resptxt += " " + motivational[Math.floor(Math.random() * motivational.length)];
        resptxt += " " + drilltxt;
        resptxt += " " + breakaudio1min;
        if ((minutes - i) > 1) {
            resptxt += (minutes - i) + " " + msg.minutesleftmsg[lang];
        } else if ((minutes - i) > 0) {
            resptxt += (minutes - i) + " " + msg.minuteleftmsg[lang];
        }
    }
    return resptxt;
}



//deprecated
function waitForUserNoMusic(minutes, drilltxt){
    var resptxt = "";
    var breaktxt = " <break time=\"10s\"/> ";
    //var breaktxt = " <audio src=\"soundbank://audio2.mp3\"/>  ";
    var breaktxt30sec = breaktxt + breaktxt + breaktxt; 
    
    var motivational = [" Go!Go!Go! ", " Keep going. ", " Don't stop! ", " Focus!Focus!Focus! ", " Go champ! "];
    
    for(var i = 1; i <= minutes; i++){
        resptxt += motivational[Math.floor(Math.random() * motivational.length)];
        resptxt += drilltxt;
        resptxt += breaktxt30sec;
        resptxt += motivational[Math.floor(Math.random() * motivational.length)];    
        
        if ((minutes - i) <= 0) {
            resptxt += "30 seconds left!";
        }
        
        resptxt += breaktxt30sec;
        
        if ((minutes - i) > 0) {
            resptxt += (minutes - i) + " minutes left!";
        }
    }
    return resptxt;
}


function startCurrentDrillIntent(handlerInput){
    var resptxt = "";    
    var sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var currentTrainning = sessionAttributes.currentTrainning;
    var minutes = 3;

    resptxt = "<speak>" + msg.startDrillmsg[lang];
    resptxt = resptxt.replaceAll("@@PART@@", (currentTrainning.currentdrill + 1));
    resptxt = resptxt.replaceAll("@@MIN@@", minutes);
    resptxt = resptxt.replaceAll("@@MOVES@@", speakDrills(currentTrainning, currentTrainning.currentdrill));

    resptxt += waitForUserMusic(minutes, speakDrills(currentTrainning, currentTrainning.currentdrill));

    
    if((currentTrainning.currentdrill + 1) >= currentTrainning.trainning.length){
        resptxt += msg.endAllDrillmsg[lang];
    } else {
        resptxt += msg.endDrillmsg[lang];    
    }
    resptxt += " </speak>";
    return resptxt;

}



const skillBuilder = Alexa.SkillBuilders.custom();
const skill = skillBuilder.create();

exports.handler = Alexa.SkillBuilders.custom()
  .withPersistenceAdapter(
        new persistenceAdapter.S3PersistenceAdapter({bucketName:"mydrills"})
   )
  .addRequestHandlers(
    LaunchRequestHandler,
    ChoseTrainningIntentHandler,
    NextDrillIntentHandler,
    StartCurrentDrillHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler)
    .addRequestInterceptors(
	    LanguageInterceptor,
        LoadUnfinishedTrainningInterceptor
    )
  .addErrorHandlers(ErrorHandler)
  .create();

const adapter = new ExpressAdapter(exports.handler, true, true);


app.post('/', adapter.getRequestHandlers());
//node app.listen(3000);

//Codigo para admin
app.get('/drills', function(req, res){
    var bucketParams = {
        Bucket : 'mydrills',
        Key: 'drills'
    };
    s3.getObject(bucketParams, function(err, data) {
        if (err){
            console.log(err, err.stack); // an error occurred
        } else {
            res.send(JSON.parse(data.Body.toString('utf-8')));           // successful response
        }
    });
});

const bodyParser = require('body-parser')
app.use(bodyParser.json()) // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

app.post('/create', function(req, res){
    var pwd = req.query.pwd;
    console.log("pwd: " + pwd)
    if(pwd == app.get('pwd')){
        var uploadParams = {Bucket: 'mydrills', Key: 'drills', Body: JSON.stringify(req.body)};

        console.log("uploaing: " + JSON.stringify(req.body))
        // call S3 to retrieve upload file to specified bucket
        s3.upload (uploadParams, function (err, data) {
            if (err) {
                console.log("Error", err);
            } if (data) {
                console.log("Upload Success", data.Location);
                res.send("save ok")
            }
        });    
    } else {
        console.log("Aint doing shit.")
    }
    
    
})
//fim cod para adm
    
    
    
app.set('port', (process.env.PORT || 5000));

app.set('pwd', (process.env.UPDATEPWD || "teste123"));


app.listen(app.get('port'), function () {
  console.log('Servidor iniciado na porta ' + app.get('port'));
});



