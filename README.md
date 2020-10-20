## About this project
This project is about integrating a module in the [bigbluebutton](https://github.com/bigbluebutton) (open source web conferencing) application which makes it possible to either chat or speak with an voice assistent by communicating with a [Natural Language Understanding API](https://github.com/Ameckto/Natural-Language-Understanding-API) in English. 


*here will be a video*


## Table of contents

* [Installation](#installation)
* [Start the hybrid server](#start-the-hybrid-server)
* [What is the benefit for the end client](#how-to-start-the-API)
* [How does it work](#how-to-start-the-API)
* [String similarity test](#How-to-train-the-model)
* [License](#license)


## Installation

In this section I will talk about what you neet to do to bring your voice assistent within your bigbluebutton application to live. 

Before you start you need to have a full biglbuebutton server running. You can installl one by fallowing the official guide [here](https://docs.bigbluebutton.org/2.2/install.html). 

You also need to fallow this development guide [here](https://docs.bigbluebutton.org/2.2/dev.html) but change the fallowing: 
    dont fork their bigbluebutton repository, fork this one
    fallow the guide and just clone this repository into your ~/dev folder
    
In order to identify the intent of the user and his mentioned entities like "hey bigbluebutton mute Steffen" which would result in a wake_up+mute intent and the entitie Steffen you need to install the [Natural Language Understanding API](https://github.com/Ameckto/Natural-Language-Understanding-API). 


Now you need to install the string similarity package which is used to be able to identify missspelled names or nicknames as users within a bigbluebutton meeting without actually typing the 100% correct name like Niklas will be identified as Niklas_93 if Niklas is present and online within the meeting. 

Navigate to your bigbluebutton-html5 folder by running: 
```sh
cd ~/dev/bigbluebutton/bigbluebutton-html5
```

Install the string similarity package by running: 
```sh
npm install string-similarity --save
```

It is also nessesary to roll back some code changes which I have used for my development process: [commit](https://github.com/Ameckto/bigbluebutton/commit/37941d1cf4f10301790b12491854cea3676d84ad)

Optional: 
To be able to transcript your commands via voice into text you need to set up a server which runs the [MAX-Speech-to-Text-Converter](https://github.com/IBM/MAX-Speech-to-Text-Converter) as an automatic speech recognition (ASR) API.

Here is a guide where you can add the ASR API to your Natural Language Understanding API server with in a matter of minutes.

First make sure you have Docker installed. If not please fallow this official guide: [Docker Installation on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)

After that create a folder (e.g. "asr"):
```sh
mkdir asr
```

Navigate to the folder: 
```sh
cd asr
```

Clone the [MAX-Speech-to-Text-Converter](https://github.com/IBM/MAX-Speech-to-Text-Converter):
```sh
git clone https://github.com/IBM/MAX-Speech-to-Text-Converter.git
```

Navigate to the folder: 
```sh
cd MAX-Speech-to-Text-Converter 
```
Hint: YOu need to have sudo rights

Build the docker image
```sh
docker build -t max-speech-to-text-converter . 
```

Start the server
```sh
docker run -it -p 5000:5000 max-speech-to-text-converter
```

Now you can go ahead and create a dedicated server for the ASR-API but there is also the oppertunity to create a hybrid server with the NLU-API and ASR-API
To accomblish that hybrid server fallow this guide below. 

Now the only thing we have to do to be able to access our NLU-API and our ASR-API within one server accessable threw our NGNIX webserver we just need to add another location and change a bit the first one from our [Natural Language Understanding API](https://github.com/Ameckto/Natural-Language-Understanding-API).

Navigate to the site-variables folder by running:
```sh
cd /etc/nginx/sites-available
```

Edit the reverse-proxy.conf file by running:
```sh
vim reverse-proxy.conf
```

Edit the reverse-proxy.conf file by running:
```sh
vim reverse-proxy.conf
```

Change your one location variable to two location variables now and add a path to it like 'location /nlu/' and 'location /asr/. 

```sh
    location /nlu/ {
             proxy_pass http://localhost:4000/;
    }
    location /asr/ {
             proxy_pass http://localhost:5000/;
    }
```      

After that is done the NLU-API should be accessable threw 
'www.example.de/nlu/model/parse' 
and the ASR-API threw 
'www.example.de/asr/model/predict'

## Start the hybrid server

Remeber you can start the NLU server by navigating to your project folder

```sh
cd <your_project_name>
``` 
Activate your venv by running:

```sh
source ./<your_virtual_environment_name>/bin/activate
``` 
Now navigate to your repository folder by running:

```sh
cd Natural-Language-Understanding-API
``` 
With this setup you need to change the localhost of the NLU-API from 5000 to 4000

```sh
rasa run --enable-api -m models/bigbluebutton.tar.gz -p 4000
``` 
You can start the ASR-API by running from anywhere on your Ubuntu machin as sudo user like: 

```sh
sudo -i
``` 
docker run -it -p 5000:5000 max-speech-to-text-converter



## How does it work

## String similarity test

It only runs on chrome as of right now


## License

This project is open source for everyone. 

