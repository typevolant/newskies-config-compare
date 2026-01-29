# NewSkies config comparison tool
Your airline just launched a new all-you-can-fly pass. Sales are strong, and you breathe a sigh of relief as you watch sales climb past $100,000 in the first hour. New subscribers are buying passes and booking flights. Hooray! 🥂

You get home from the long workday and slide into a comfortable outfit, slowly releasing tension from the day’s waves of apprehension, satisfaction, and pride. Strong work. 💪 

*ding* 👀 Uh oh.

“I really hate to bother you after hours,” the message starts, “but can you help? Customers keep telling us they can’t check in for their flight tomorrow using the app. We had them clear their cache and cookies. They also went to our website. It’s just not working.”

Dread spreads. The day already drained you, but you know how much online check-in matters. You sheepishly ask for a few reservation ID, and the reply to your message snaps back at you all too fast.

You open the work laptop and log back in. *yawns* Tap tap tap. Let’s see the first reservation. Hmm, yes, okay, that flight leaves in less than 24 hours. They should be able to check in, so something’s weird here. Next one, hmm, same thing. The third…

Oh, shit. All three of these reservations are from new pass subscribers traveling tomorrow.

You try to run through the check-in flow and review server logs for clues about why these reservations are breaking check-in. You pray for a plain-English error message or even garbled codes that give some context. 
Something. Nothing.
Fuck.

You know deep down that you have to go in there, but you don’t want to. Role settings. It must be in there, but where? The needle is ready to be found inside that haystack.

784 clicks later, you spot it: a new SSR used by the subscription didn’t get added to the production check-in permissions on one of your roles. 

Click. Save. Fixed. 
Weep. 😭

Did it have to be like this?

This NewSkies configuration comparison tool lets you quickly compare configuration differences between roles and environments. 

Instead of waiting for failure reports, you can now run it immediately after configuration changes before your brain turns to mush. It’s better than a second pair of eyes: it’s systematic comparison.

Rejoice and try it out.

## Features
- Generate snapshots of your NewSkies configuration
- Compare differences between roles
- Compare differences across environments
- View config changes over time
- View and search NewSkies Management Console documentation
- Read-only API calls: it won’t make configuration changes
- Your data is yours: the tool runs on your own machine

## Prerequisites
- Access to a valid Navitaire Digital API environment
- Valid NewSkies administrator credentials
- A Mac, Linux, or Windows [(WSL 2)](https://learn.microsoft.com/en-us/windows/dev-environment/javascript/nodejs-on-wsl)
- Python v3.14+
- Node v24+

## Setup & installation
### Download the tool
Option 1: git clone (recommended)
Execute the command to download the latest version from GitHub `git clone git@github.com:typevolant/newskies-config-compare.git`

Option 2: download ZIP archive
https://github.com/typevolant/newskies-config-compare/archive/refs/heads/main.zip

### Configure your NewSkies environments
Create a `.json` config file for each environment you want to connect to. An example file is located in `/config/config-sample.json`. 

- Copy the sample file and rename it to a meaningful name for your environment
- Place the renamed file into `/config/environments`
- Edit the renamed file and input the following information:
    - Digital API base url
    - Environment name

### Load documentation (optional)
This tool can display NewSkies management help content specific to your environment.
1. Locate your NewSkies Management Console help file with a CHM extension. It could be named something like `Navitaire.NewSkies.UI.Win.SkyManagerHelp.chm`
2. Place that `.chm` file in the `/docs` folder of this project
3. Open your command line and run the CHM to HTML conversion script located in the `/docs` folder.
- Example: `python3 ./chm_to_html.py Navitaire.NewSkies.UI.Win.SkyManagerHelp.chm`
4. When the files are converted, move all files from the folder created by the script into the `/docs` directory
- Example: `mv * ../`

### Prepare and run application
- Install the application using `npm i`
- If you loaded documentation: prepare the documentation using `npm run process-docs`
- Run the node server by running `npm run preview`
- Open your browser and navigate to `http://localhost:4173`

### What it’s doing
- **Login:** obtains a Digital API token using `POST /api/auth/v1/token/user`
- **Generate snapshot:** 
- finds all active roles using `GET /api/nsk/v2/resources/roles`
- obtains environment config details from `GET /api/settings/*` endpoints; 14 are global and 18 are role-specific
- Saving a snapshot on the application server local storage for comparison

## Using the tool
### Create your first snapshots
- Open the tool locally or on your application server.
- Select a configured NewSkies environment
![Environment selection](/src/assets/readme_snapshot_environment_selection.png)
- Login using your NewSkies credentials
![Environment login](/src/assets/readme_login.png)
- Click "Generate Snapshot"
![Ready to create snapshot](/src/assets/readme_snapshot_create.png)
- Watch it all load nom nom gobble snarf. 🦖
![Snapshot getting created](/src/assets/readme_snapshot_inprogress.png)

### Compare differences
- Select the source files you want to compare. You can compare an environment against itself at a different point in time or across environments.
![Selecting source files for comparison](/src/assets/readme_snapshot_compare_select.png)
- Select the configuration category you want to review
![Comparing differences between roles](/src/assets/readme_snapshot_diff.png)
- You can choose between viewing differences only or all configuration values
![See all values](/src/assets/readme_snapshot_all_values.png)

### Reference NewSkies management documentation
If you've populated the tool with your NewSkies documentation you can view it by clicking on "Docs" in the top right or the "i" buttons next to various configurations.
![View documentation](/src/assets/readme_doc_viewer.png)

You can also search for specific words in articles
![Document search](/src/assets/readme_doc_search.png)

## Good to know
- You must use the tool on a computer that is allowed to connect to your Digital API environment. You may need to be connected to a VPN or other corporate network.
- Tested against Digital API v4.7.x, theoretically compatible back to 4.4.2

## Limitations
- Single Sign-on (SSO) and Multi-factor authentication (MFA) providers are not supported

## Project details
- This app is built in React + TypeScript + Vite.
- Contributions are welcome: create an issue if you spot problems or propose improvements via a pull-request

## Disclaimers
- This project is subject to LICENSE terms and is provided AS IS.
- This project is not affiliated with or endorsed by Navitaire, Amadeus, or any of their subsidiaries.