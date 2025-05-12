#!/usr/bin/env node
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { config } from 'dotenv';
import { z } from 'zod';
import { DepositRequest, DepositResponse, getActiveConf, getCorrespondentAvailability, getCorrespondentPredict, getDeposit, sendDeposit } from "./pawapay.js";
import { DateTime } from "luxon";

// Load environment variables
config();


// Environment variables validation
const envSchema = z.object({
  PORT: z.string().default('3000'),
  HOST: z.string().default('localhost'),
  PAWAPAY_API_URL: z.string().default('https://api.sandbox.pawapay.cloud'),
  PAWAPAY_API_KEY: z.string().default('ADD YOUR API KEY HERE'),
  MCP_SERVER_NAME: z.string().default('pawaPay MCP Transactions'),
  MCP_SERVER_VERSION: z.string().default('1.0.0')
});
export const env = envSchema.parse(process.env);
const server = new McpServer({
  name: env.MCP_SERVER_NAME,
  version: env.MCP_SERVER_VERSION
});


  const depositTemplate = new ResourceTemplate('deposit://{depositId}', {
    list: undefined,
  });
  
  // Add a root resource handler for deposit
  server.resource(
    'deposit-root',
    'deposit://',
    async (uri, ctx) => {
      return { contents: [{
        uri: uri.href,
        text: JSON.stringify({ message: "Use deposit://{depositId} to query specific deposits" })
      }]}
    }
  );

  server.resource(
    'deposit',
    depositTemplate,
    async (uri, params, ctx) => {
      let token : string | undefined = env.PAWAPAY_API_KEY;
      const results: DepositResponse[] = [];
      if (Array.isArray(params.depositId)) {
        for (const depositId of params.depositId) {
          const response = await getDeposit(depositId, token, env.PAWAPAY_API_URL);
          results.push(response);
        }
      } else {
        const response = await getDeposit(params.depositId, token, env.PAWAPAY_API_URL); 
        results.push(response);
      }
      return { contents: [{
        uri: uri.href,
        text: JSON.stringify(results)
      }]}
    }
  );

  export const activeConfTemplate = new ResourceTemplate('activeconf://{country}', {
    list: undefined,
  });
  
  // Add a root resource handler for activeconf by country
  server.resource(
    'activeconf-country-root',
    'activeconf-country://',
    async (uri, ctx) => {
      return { contents: [{
        uri: uri.href,
        text: JSON.stringify({ message: "Use activeconf://{country} to query active configuration for a specific country" })
      }]}
    }
  );

  export const correspondentAvailabilityTemplate = new ResourceTemplate('correspondentavailability://{country}', {
    list: undefined,
  });

  // Add a root resource handler for correspondent availability by country
  server.resource(
    'correspondentavailability-country-root',
    'correspondentavailability-country://',
    async (uri, ctx) => {
      return { contents: [{
        uri: uri.href,
        text: JSON.stringify({ message: "Use correspondentavailability://{country} to query availability for a specific country" })
      }]}
    }
  );

  export const correspondentPredictTemplate = new ResourceTemplate('correspondentpredict://{msisdn}', {
    list: undefined,
  });
  
  // Add a root resource handler for correspondent predict
  server.resource(
    'correspondentpredict-root',
    'correspondentpredict://',
    async (uri, ctx) => {
      return { contents: [{
        uri: uri.href,
        text: JSON.stringify({ message: "Use correspondentpredict://{msisdn} to predict correspondent for a specific phone number" })
      }]}
    }
  );

  server.resource(
    "activeconf",
    "activeconf://",
    async (uri, ctx) => {
     let token = env.PAWAPAY_API_KEY;
     const response = await getActiveConf(token ,env.PAWAPAY_API_URL); 
     return { contents: [{
      uri: uri.href,
      text: JSON.stringify(response)
    }]}
    }
  );

  server.resource(
    "activeconfcountry",
    activeConfTemplate,
    async (uri, params, ctx) => {
     let token = env.PAWAPAY_API_KEY;
     const response = await getActiveConf(token ,env.PAWAPAY_API_URL); 
     const c = [];
     for (const country of response.countries) {
      if (country.country === params.country) {
        c.push({
          country: country
        })
      }
     }
     const output = {
      merchantId:response.merchantId,
      merchantName: response.merchantName,
      countries:c
     }
     return { contents: [{
      uri: uri.href,
      text: JSON.stringify(output)
    }]}
    }
  );

  server.tool(
    "activeConfCountryTool",
    {country: z.string()},
    async ({country}, ctx) => {
     let token = env.PAWAPAY_API_KEY;
     const response = await getActiveConf(token ,env.PAWAPAY_API_URL); 
     const allCountries=[];
     const countryArray = [];
     let found = false;
     for (const c of response.countries) {
      allCountries.push({
        country: c
      });
      if (c.country === country) {
        countryArray.push({
          country: c
        })
        found = true;
      }
     }
     let output = {
      merchantId:response.merchantId,
      merchantName: response.merchantName,
      countries: allCountries,
     }
     if (found){
       output = {
        merchantId:response.merchantId,
        merchantName: response.merchantName,
        countries: countryArray,
       }
     }
     return { content: [{
      type: "text",
      text: JSON.stringify(output)
    }]}
    }
  );

  server.resource(
    "correspondentpredict",
    correspondentPredictTemplate,
    async (uri, params, ctx) => {  
     let token = env.PAWAPAY_API_KEY;
     const results: any[] = [];
     if (Array.isArray(params.msisdn)) {
      for (const msisdn of params.msisdn) {
        const response = await getCorrespondentPredict(msisdn, token ,env.PAWAPAY_API_URL);
        results.push(response);
      }
    } else {
      const response = await getCorrespondentPredict(params.msisdn, token ,env.PAWAPAY_API_URL); 
      results.push(response);
    }
    return { contents: [{
      uri: uri.href,
      text: JSON.stringify(results)
    }]}
    }
  );

  server.tool(
    "correspondentPredictTool",
    { msisdn: z.string() },
    async ({msisdn}, ctx) => {  
     let token = env.PAWAPAY_API_KEY;
     if (!msisdn) {
      return { content: [{
        type: "text",
        text: "No msisdn provided"
      }]}
     }
    const response = await getCorrespondentPredict(msisdn, token ,env.PAWAPAY_API_URL); 
    return { content: [{
      type: "text",
      text: JSON.stringify(response)
    }]}
    }
  );

  server.resource(
    "correspondentavailability",
    "correspondentavailability://",
    async (uri, ctx) => {
     const response = await getCorrespondentAvailability(env.PAWAPAY_API_URL); 
     return { contents: [{
      uri: uri.href,
      text: JSON.stringify(response)
    }]}
    }
  );
  
  server.resource(
    "correspondentavailabilitycountry",
    correspondentAvailabilityTemplate,
    async (uri, params, ctx) => {
      let token = env.PAWAPAY_API_KEY;
      const response = await getCorrespondentAvailability(env.PAWAPAY_API_URL); 
      const c = [];
      for (let availability of response) {
       if (availability.country === params.country) {
         c.push({
           country: availability
         })
       }
      }
      const output = {
       countries:c
      }
      return { contents: [{
       uri: uri.href,
       text: JSON.stringify(output)
     }]}
     }
  );

  server.tool(
    "correspondentAvailabilityCountryTool",
    { country: z.string() },
    async ({country}, ctx) => {
      let token = env.PAWAPAY_API_KEY;
      const response = await getCorrespondentAvailability(env.PAWAPAY_API_URL); 
      const c = [];
      const allCountries = []
      let found = false;
      for (let availability of response) {
        allCountries.push({
          country: availability
        });
       if (availability.country === country) {
         c.push({
           country: availability
         })
         found = true;
       }
      }
      let output = {
        countries:allCountries,
      }
      if (found) {
        output = {
          countries: c
        }
      }
      return { content: [{
       type: "text",
       text: JSON.stringify(output)
     }]}
     }
  );


  server.tool(
    "deposit",
    { depositId: z.string(),
      amount: z.string(),
      currency: z.string(),
      msisdn: z.string(),
      correspondent: z.string(),
      country: z.string(),
      description: z.string(),
     },
    async ({ depositId, amount, currency, msisdn, correspondent, country, description }, ctx: any) => {
     const deposit : DepositRequest = {
      depositId,
      preAuthorisationCode: null ,
      amount,
      currency,
      country,
      correspondent,
       payer: {
        type: 'MSISDN',
        address: {
          value: msisdn
          }
        },
       statementDescription: description,
       customerTimestamp: DateTime.now().toISO(),
       metadata: null
     }
     let token = env.PAWAPAY_API_KEY;
     const response = await sendDeposit(deposit, token, env.PAWAPAY_API_URL); 
     return { content: [{ type: "text", text: JSON.stringify(response) }]}
    }
  );

  server.tool(
    "depositStatus",
    { transactionId: z.string() },
    async ({ transactionId }, ctx: any) => {
     let token = env.PAWAPAY_API_KEY;
     const response = await getDeposit(transactionId, token, env.PAWAPAY_API_URL); 
     return { content: [{ type: "text", text: JSON.stringify(response) }]}
    }
  );
  

    server.prompt(
    "pawapay support agent",
    { },
    ({}) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `You are a helpful support agent for pawaPay. You are able to answer pawaPay platform status and help users with their transactions.
          You can :-
          1. Show all the correspondent status's or correspondent status for a specific country
          2. Get the relevant correspondent for a specific msisdn
          3. Show deposit for a specific transactionId
          5. Show the merchants active configuration
          6. Show the merchants active configuration for a specific country
          7. Submit a deposit for approval by the end user
          `
        }
      }]
    })
  );

// Start the server
// The transport is already provided in the server constructor
server.connect(new StdioServerTransport()).catch(error => {
  process.exit(1);
});
