# GenAIScript Playground

## Install GenAIScript CLI

```
npm install -g genaiscript
```

## Configure GenAIScript CLI

To configure the [GenAIScript] CLI you have first create a [configuration-file]. go to your home directory and create file `genaiscript.config.json` as show below

### genaiscript.config.json schema
```typescript
import { ModelConfiguration } from "./host"

// Schema for a global configuration file
export interface HostConfiguration {
    // Path to the .env file
    envFile?: string
    
    // List of glob paths to scan for genai scripts
    include?: string[]

    // Configures a list of known aliases. 
    modelAliases?: Record<string, string | ModelConfiguration>
}
```
### ~/genaiscript.config.json template
 ```json
 {
    "envFile": "<HOME DIR>/.env.genaiscript",

    "include": [
        "<SCRIPT PATH 1>/*.genai.mjs",
        "<SCRIPT PATH 2>/*.genai.mjs",
        
        "<SCRIPT PATH N>/*.genai.mjs",
    ]
}
```

property | description
---- | ----
`env.file` | The final location of envFile will be used to load the secret in the environment variables.
`include` | The include property allows you to provide `glob` paths to include more scripts. Combined with a global configuration file, this allows to share script for a number of projects.


## Commenter script

Comments your code with **local AI** using [GenAIScript]

### Requirements

1. Download and Install [Ollama] server
1. Install [Ollama] local model: [qwen2.5-coder:7b]
   > `ollama pull qwen2.5-coder `

### Install script

Download [@commenter.genai.mjs](./@commenter.genai.mjs) into a folder configured in `include` property of [~/genaiscript.config.json](#genaiscriptconfigjson-template)

### Run script

```
genaiscript run @commenter <source files glob path>
```

*Examples**

```
genaiscript run @commenter <my_java_project_path>/*.java
genaiscript run @commenter <my_java_project_path>/**/*.java

genaiscript run @commenter <my_javascript_project_path>/**/*.js

genaiscript run @commenter <my_typescript_project_path>/**/*.ts

```

### Supported languages 

- [x] Java
   > * class declarations
   > * interface declarations
   > * method declarations
- [x] Javascript
   > * function declarations
   > * assow function declarations
- [x] Typescript
   > * function declarations
   > * arrow function declarations
   > * type alias declarations
   > * interface declarations
- [ ] Swift



[qwen2.5-coder:7b]: https://ollama.com/library/qwen2.5-coder
[Ollama]: https://ollama.com
[configuration]: https://microsoft.github.io/genaiscript/getting-started/configuration/
[configuration-files]: https://microsoft.github.io/genaiscript/reference/configuration-files/
[GenAIScript]: https://microsoft.github.io/genaiscript/]
