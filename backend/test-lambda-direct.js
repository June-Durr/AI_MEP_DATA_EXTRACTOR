// Direct Lambda invocation to see error details
const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });

const lambda = new AWS.Lambda();

const params = {
  FunctionName: 'mep-survey-analyzer',
  InvocationType: 'RequestResponse',
  Payload: JSON.stringify({
    httpMethod: 'POST',
    body: JSON.stringify({
      imageBase64: 'test',
      equipmentType: 'hvac'
    })
  })
};

lambda.invoke(params, (err, data) => {
  if (err) {
    console.error('Error invoking Lambda:', err);
  } else {
    console.log('Status Code:', data.StatusCode);
    console.log('Response:', data.Payload);

    if (data.FunctionError) {
      console.error('Function Error:', data.FunctionError);
      const payload = JSON.parse(data.Payload);
      console.error('Error details:', payload);
    }
  }
});
