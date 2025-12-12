export interface SampleDataset {
  id: string;
  name: string;
  description: string;
  fileName: string;
  data: string;
}

export const sampleDatasets: SampleDataset[] = [
  {
    id: "sales",
    name: "Sales Report",
    description: "Monthly sales data with revenue and units sold",
    fileName: "sales_data.csv",
    data: `Month,Revenue,Units Sold,Region,Product Category
Jan 2024,45200,312,North,Electronics
Feb 2024,52100,385,North,Electronics
Mar 2024,48900,341,North,Electronics
Apr 2024,61200,420,South,Electronics
May 2024,58700,398,South,Electronics
Jun 2024,72300,512,South,Electronics
Jul 2024,68100,478,East,Home & Garden
Aug 2024,74500,521,East,Home & Garden
Sep 2024,82100,589,East,Home & Garden
Oct 2024,91200,642,West,Home & Garden
Nov 2024,105800,738,West,Clothing
Dec 2024,118400,824,West,Clothing`
  },
  {
    id: "survey",
    name: "Customer Survey",
    description: "Customer satisfaction ratings across categories",
    fileName: "survey_results.csv",
    data: `Response ID,Age Group,Satisfaction,Ease of Use,Value for Money,Would Recommend,Department
1,18-24,4,5,4,Yes,Support
2,25-34,5,4,5,Yes,Sales
3,35-44,3,3,4,No,Support
4,45-54,4,4,3,Yes,Product
5,25-34,5,5,5,Yes,Sales
6,18-24,4,4,4,Yes,Support
7,55-64,3,2,3,No,Product
8,35-44,5,5,4,Yes,Sales
9,25-34,4,4,5,Yes,Support
10,45-54,5,4,4,Yes,Product
11,18-24,3,4,3,No,Sales
12,35-44,4,5,4,Yes,Support
13,55-64,4,3,4,Yes,Product
14,25-34,5,5,5,Yes,Sales
15,45-54,4,4,4,Yes,Support`
  },
  {
    id: "weather",
    name: "Weather Stats",
    description: "Daily temperature and precipitation data",
    fileName: "weather_data.csv",
    data: `Date,High Temp (F),Low Temp (F),Precipitation (in),Humidity (%),Wind Speed (mph),Condition
2024-01-01,42,28,0.2,65,8,Cloudy
2024-01-02,38,24,0.5,78,12,Rain
2024-01-03,35,22,0.8,82,15,Rain
2024-01-04,40,26,0,58,6,Sunny
2024-01-05,45,30,0,52,5,Sunny
2024-01-06,48,32,0.1,60,7,Cloudy
2024-01-07,44,29,0.3,68,10,Rain
2024-01-08,41,27,0,55,8,Sunny
2024-01-09,39,25,0.4,72,14,Rain
2024-01-10,36,23,0.6,80,16,Rain
2024-01-11,42,28,0,48,5,Sunny
2024-01-12,50,34,0,45,4,Sunny
2024-01-13,52,36,0,50,6,Sunny
2024-01-14,48,33,0.2,62,9,Cloudy`
  }
];
