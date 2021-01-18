# ReminderApp

This is an app for the following task.

Write a NodeJS app that calls an API in API Manager which connects to your Calendar, gets the list of events for the day and sends you an SMS. 
Use the Google Calendar API and Twilio APIs to implement the functionality of the API on MI. The Google calendar credentials, Twilio credentials, 
Twilio From and To phone numbers should be provided as input params (environment variables) to the CApp that is deployed on MI. The client id, 
client secret and APIM Gateway url should be provided as input params (environment variables) to the NodeJS application. The NodeJS app should 
use client credentials to get an access token from API Manager to invoke the API. 
