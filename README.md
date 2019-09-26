# Frontend Repo Analyzer

This small tool can analyze Git repositories and report metrics about them, these reports can be sent to email, text file, console, or even through json.
This tool was designed to be plugable, can work with an unlimited number of repositories and metrics. Caching is used to save computing and time.

## Table of Contents
1. [Installation and usage ](#installation-and-usage)
2. [Configuration](#configuration)
3. [Add custom metrics](#add-custom-metrics)
4. [Custom config file](#custom-config-file)
5. [Reporters](#reporters)
6. [Arguments](#arguments)
7. [FAQ](#faq)
8. [License](#license)


## Installation and Usage

Prerequisites: [Node.js](https://nodejs.org/en/) (^8.10.0), npm version 5.X+.

You can install this tool globally using npm:

`$ npm install frontend-repo-analyzer -g`

After installing the tool, you must configure it. The configuration isn’t trivial, therefore you must follow the steps in the next topic. (anchor)

Once you have installed and configured the tool correctly, you can run it:

`$ frontend-repo-analyzer `

You can specify additional configurations on the fly using arguments:

`$ frontend-repo-analyzer -file config.json`

A detailed argument list can be found at the topic 3. (anchor)


## Configuration

In order to use the tool you must configure it first. The tool loads the metrics and runs them against the specified repositories (specified in the config file). (anchor)
Some metrics are available by default, but you can add yours very easily. Just follow this (anchor)


## Add custom metrics

Metrics can be user defined. In order to define a metric, you must create a file in the metrics folder with the format **“name.metric.js”**.  You can change this folder in the configuration file, by default it will be used the folder **“metrics”** inside the tool.
When you create a new metric, you must implement the base metric and his main 3 methods ( info, verify, execute ). Both verify and execute are async.
- **info()**: returns an object containing the metric name and group. This group can be modified in <file>. Grouping metrics can be useful when you have a lot of metrics.
- **verify()**: returns a boolean and specifies whether its possible to run this metric for a given repository or not. For example, when calculation the coverage, if the repo does not have jest, it's impossible to calculate the metric therefore **verify()** should return false.
- **execute()**: returns and object with the result for the metric being calculated. In this method occurs the calculation for the metric.  

The metrics folder can be specified in the configuration file, more on this file can be found later in this documentation.

## Custom config file

The config file is responsible for holding the configuration for the tool. By default the tool will try to find **“fe-analyzer-config.json”** on your home folder, if it fails to load this file, it will look for **“default-fe-analyzer-config.json”** located in the tool’s folder. You can specify a custom configuration file through argument, passing the flag **“ -file config.json”**.

## File Structure: 


As you can see, the configuration file follows a simple structure:
- **repos**: array of repositories, this are the repositories that are going to be analyzed.
    - **gitRepoUrl** is the url where the tool will try to fetch the repository.
    - **label** is used to name the project inside of the tool, it's also the name that will appear in the report.
    - **target** branch is the branch that will be used to run the metrics.

- **metrics-folder**: specifies where to load the metrics from.
- **reporters**: As the name implies, this section contains the configurations used by the reporters. 
    - **active**: in order to activate a report, you have to specify his name in this array. Possible reporters are : “email, “formated-file, “json”, “console”. 
    - **email**: this object is passed directly to “node-mailer”. In order to obtain more information about its inner workings or configuration, you must visit: https://nodemailer.com/
    - Later in this document, you can find more information about the reports and how to modify them.


 ```
 {
  "repos": [ 
    {
      "gitRepoUrl": "https://github.com/feedzai/brushable-histogram.git",
      "targetBranch": "master",
      "label": "Histogram"
    }
  ],
  "metrics-folder": "./metrics",
  "reporters": {
    "active": ["console", "formated-file"],
    "formated-file":"./tmp/report.txt",
    "console": {},
    "json": {
      "output-file": "./tmp/report.json"
    }
  }
}
 ```

 ## Reporters

 Reporters are one of the most important parts of this tool, they give us the information that we were looking for in the first place.
There are 4 possible report types built-in in this tool: email, console, text file, json file.
If you want to modify the email template you can do that by modifying the “pug” template file in “./email/grouped”.
You can also add another templates and use them by specifying the name in the config file.

## Arguments

- file <filename.json> : loads a specific configuration
- user <elasticsearch user> used to send elasticsearch reports
- password <elasticserach password>  used to send elasticsearch reports
- factor <number> factor used to jump commits when calculating project's history. The bigger the factor the bigger the jumps.
- history when used will calculate the history for the repos with "calculate-history": true in the config file

## FAQ

Some questions….

## License

Some license agreement

