//BEGIN LICENSE BLOCK 
//Interneuron Terminus

//Copyright(C) 2023  Interneuron Holdings Ltd

//This program is free software: you can redistribute it and/or modify
//it under the terms of the GNU General Public License as published by
//the Free Software Foundation, either version 3 of the License, or
//(at your option) any later version.

//This program is distributed in the hope that it will be useful,
//but WITHOUT ANY WARRANTY; without even the implied warranty of
//MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

//See the
//GNU General Public License for more details.

//You should have received a copy of the GNU General Public License
//along with this program.If not, see<http://www.gnu.org/licenses/>.
//END LICENSE BLOCK 
export class Observationevent {
    constructor(
      public observationevent_id: string,
      public person_id: string,
      public datestarted: any,
      public datefinished: any,
      public addedby: string,
      public encounter_id: string,
      public isamended: boolean,
      public observationfrequency: number,
      public observationscaletype_id: string,
      public escalationofcare: boolean,
      public reasonforamend: string,
      public _createdby: string,
      public reasonforincompleteobservations?: string,
      public reasonfordelete?: string,
      public eventcorrelationid?: string,
      public incomplete?: boolean
    ) { }
  }
  
  
  export class Observation {
    constructor(
      public observation_id?: string,
      public units?: string,
      public symbol?: string,
      public timerecorded?: any,
      public observationevent_id?: string,
      public observationtype_id?: string,
      public observationtypemeasurement_id?: string,
      public value?: string,
      public hasbeenammended?: boolean,
      public _createdby?: string,
      public eventcorrelationid?: string,
      public method?: string
    ) { }
  }
  
  export class Observationscaletype {
  
    observationscaletype_id: string
    scaletypename: string
    scaletypedescription: string
  }
  
  export class PersonObservationScale {
    personobservationscale_id: string;
    person_id: string;
    observationscaletype_id: string;
  
  }
  