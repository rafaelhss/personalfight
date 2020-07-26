const currentTrainningName = 'currentTrainning';
const bucketName = 'mydrills';


var AWS = require('aws-sdk');
AWS.config.update({region: 'us-west-2'});
s3 = new AWS.S3({apiVersion: '2006-03-01'});


const express = require('express');



const { ExpressAdapter } = require('ask-sdk-express-adapter');
const Alexa = require('ask-sdk-core');

const app = express();

app.use(express.static('public'));



const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    const speechText = "<speak>Welcome to Personal Fight. We have easy, normal and hard boxing and kickboxin trainings. What do you want to train?</speak>";

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
      
    const speechText = await choseTrainningIntent(handlerInput,level, type);
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
    
    const speechText =  nextDrillIntentIntent(handlerInput);
    return handlerInput.responseBuilder
      .speak(speechText)
      .withShouldEndSession(false)
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
    const speechText = 'Chose a type and level of training. for example: I want to train boxing hard.';

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
  handle(handlerInput) {
    const speechText = 'Goodbye!';

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
  handle(handlerInput) {
    //any cleanup logic goes here
    return handlerInput.responseBuilder.getResponse();
  }
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
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
            resp += currentTrainning.trainning.drill[i].moves;
            if(i < n){
                resp += ". then ";  
            }
        }    
    } catch (err) {
        console.log(err);
    }
    
    return resp + ". ";
}

function nextDrillIntentIntent(handlerInput){
    var resptxt = "";

    var sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var currentTrainning = sessionAttributes.currentTrainning;
    currentTrainning.currentdrill += 1;
    sessionAttributes.currentTrainning = currentTrainning;
    handlerInput.attributesManager.setSessionAttributes(sessionAttributes)

    if(currentTrainning.currentdrill >= currentTrainning.trainning.drill.length){
        resptxt = "<speak> Congratulations! Trainning session is over. you are done! </speak>";
    } else {
        resptxt = "<speak> Ok! Part " + (currentTrainning.currentdrill + 1) + ". Lets add more moves to that drill. In the end of the drill add: "
        + currentTrainning.trainning.drill[currentTrainning.currentdrill].moves
        + " <break time=\"1s\"/>"
        + ". So, the full drill now is: ";

        resptxt += speakDrills(currentTrainning, currentTrainning.currentdrill);

        resptxt += " <break time=\"1s\"/>"
        + ". I will say it one more time: "

        resptxt += speakDrills(currentTrainning, currentTrainning.currentdrill);

        resptxt += " Tell me if you are ready. </speak>"
    } 
    console.log(resptxt);
    return resptxt;
}


function choseTrainningIntent(handlerInput, level, type){
    
    function checkLevel(trainning, level){
        var count = 0;
        trainning.drill.forEach(function(item){
            count += item.moves.split(",").length;
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
        trainning.drill.forEach(function(item){
            if(item.moves.indexOf("kick") > 0){
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
                var trainnings = JSON.parse(data.Body.toString('utf-8'));           // successful response
                console.log(data.Body.toString('utf-8'));
                var filteredtrainnings = trainnings.filter(function(trainning){
                    return checkLevel(trainning, level) && checkType(trainning, type)
                });
                console.log(filteredtrainnings);
                
                if(filteredtrainnings.length <= 0){ //enquanto nao enche a bas
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


                console.log(currentTrainning);

                console.log(currentTrainning.trainning.drill[0].moves);
                resptxt = "<speak> All right! lets start. Full drill will be: "; 

                    resptxt += speakDrills(currentTrainning, currentTrainning.trainning.drill.length-1);
                    resptxt += " <break time=\"1s\"/>"
                    + " Lets begin with the first drill: "
                    + currentTrainning.trainning.drill[0].moves 
                    + " <break time=\"2s\"/> again: "
                    + currentTrainning.trainning.drill[0].moves 
                    + ". Tell me if you are ready. </speak>";
                resolve(resptxt);
            }
        });
    }));
}

function waitForUserMusic(minutes, drilltxt){
    var resptxt = "";
    //var breaktxt = " <break time=\"10s\"/> ";
    var breakaudio1min = " <audio src=\"https://personalfight.herokuapp.com/audio2.mp3\"/>  ";
    
    var motivational = [" Go!Go!Go! ", " Keep going. ", " Don't stop! ", " Focus!Focus!Focus! ", " Go champ! "];
    
    for(var i = 1; i <= minutes; i++){
        resptxt += motivational[Math.floor(Math.random() * motivational.length)];
        resptxt += drilltxt;
        resptxt += breakaudio1min;
        if ((minutes - i) > 0) {
            resptxt += (minutes - i) + " minutes left!";
        }
    }
    return resptxt;
}




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

    resptxt = "<speak> Ok! Part " + (currentTrainning.currentdrill + 1) + ". " + minutes + " minutes. "; 

    resptxt += speakDrills(currentTrainning, currentTrainning.currentdrill);

    resptxt += " <break time=\"1s\"/> 3, " 
                                            + " <break time=\"1s\"/> 2, " 
                                            + " <break time=\"1s\"/> 1, GO! ";   


    resptxt += waitForUserMusic(minutes, speakDrills(currentTrainning, currentTrainning.currentdrill));


    resptxt += " Ok, Stop! Good job! Take a breath! When you are ready, ask for next drill."
    resptxt += " </speak>";
    return resptxt;

}



const skillBuilder = Alexa.SkillBuilders.custom();
const skill = skillBuilder.create();

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    ChoseTrainningIntentHandler,
    NextDrillIntentHandler,
    StartCurrentDrillHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler)
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
    
})
//fim cod para adm
    
    
    
app.set('port', (process.env.PORT || 5000));


app.listen(app.get('port'), function () {
  console.log('Servidor iniciado na porta ' + app.get('port'));
});



