import * as ashby from './ashby.js';
import * as dice from './dice.js';
import * as greenhouse from './greenhouse.js';
import * as lever from './lever.js';
import * as linkedin from './linkedin.js';
import * as multi from './multi.js';
import * as seek from './seek.js';
import * as stepstone from './stepstone.js';
import * as workday from './workday.js';
import * as wttj from './wttj.js';

export const ADAPTERS = {
  greenhouse,
  lever,
  ashby,
  workday,
  dice,
  wttj,
  seek,
  stepstone,
  jobstreet: seek.brandAdapter('jobstreet'),
  jobsdb: seek.brandAdapter('jobsdb'),
  linkedin,
  multi,
};
