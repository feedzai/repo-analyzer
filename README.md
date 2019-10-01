# Frontend Repo Analyzer

This small tool can analyze Git repositories and report metrics about them, these will then be sent to Elastic/Kibana or optionally to file or the console.
This tool was designed to be plugable, can work with an unlimited number of repositories and metrics.

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

Prerequisites: [Node.js](https://nodejs.org/en/) (+8.x), npm version +6.X.

To install run:

`$ npm i @feedzai/repo-analyzer --save-dev`

After installing the tool, we recommend that you add it to the npm scripts:

`"analyze": "repo-analyzer --username=john.doe --password=password"`

The `username` and `password` parameters will be used to connect to Kibana.

The first time you run the tool it will create a `.repo-analyzer` file. We recommend the configuration to be but on a separate repository and be linked to in `.repo-analyzer`. The default file will point to the [feedzai configuration](https://github.com/feedzai/repo-analyzer-feedzai-config). If you want to use it you need to run:

`$ npm i @feedzai/feedzai-config --save-dev`

For details on what metrics are available here, plese consult the documentation in the [repo](https://github.com/feedzai/repo-analyzer-feedzai-config).

One important detail: the Feedzai configuration assumes that your Kibana instance is on your local machine.

We recommend configuring the tool to run in CI at each commit.

It is also recommend to run the tool in the "history" mode to calculate historical data and have better dashboards (more details on that below).

## History mode

The tool is capable of collecting data about the project‘s history based on the commit history. 
This feature may be useful if you want to know how your project has varied over time, and what impact some dependency made in your bundesize for example.

In order to analyze the project’s history you just need to pass the “--history” flag into the tool:

`$ npm run analyze -- --history`

This will calculate the metrics in each commit. For large repos it's possible to pass a parameter that will do an exponential sampling as time goes back:

`$ npm run analyze -- --history --factor=1`

## Creating a custom configuration

In some cases you might want to implement custom metrics or have a custom configuration.

### Configuration file

TODO document configuration file here

### Creating new metrics

When you create a new metric, you must implement the base metric and his main 3 methods ( info, verify, execute ). Both verify and execute are async.
- **info()**: returns an object containing the metric name and group. This group can be modified in <file>. Grouping metrics can be useful when you have a lot of metrics.
- **verify()**: returns a boolean and specifies whether its possible to run this metric for a given repository or not. For example, when calculation the coverage, if the repo does not have jest, it's impossible to calculate the metric therefore **verify()** should return false.
- **execute()**: returns and object with the result for the metric being calculated. In this method occurs the calculation for the metric.
- **schema()**: returns the schema configuration sent to Kibana/Elastic. If you don't to send the metrics to Kibana it is not necessary to implement this method.
    
Examples [here](https://github.com/feedzai/repo-analyzer-feedzai-config/tree/master/metrics).

 ## Reporters

Besides sending the data to Kibana it is also possible to output to a json file or to console.

TODO: add details on how to do this.

## Arguments

- file <filename.json> : loads a specific configuration
- user <elasticsearch user> used to send elasticsearch reports
- password <elasticserach password>  used to send elasticsearch reports
- factor <number> factor used to jump commits when calculating project's history. The bigger the factor the bigger the jumps.
- history when used will calculate the history for the repos with "calculate-history": true in the config file

## License

MIT

