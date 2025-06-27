//BEGIN LICENSE BLOCK 
//Interneuron Terminus

//Copyright(C) 2025  Interneuron Limited

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
import { Subject } from 'rxjs';


export class filter {
  filterClause: string[];

  constructor(c: any) {
    this.filterClause = c;
  }
}
export class filters {
  filters: filter[];

  constructor
    () {
    this.filters = [];
  }

}

export class filterparam {
  paramName: string;
  paramValue: string;

  constructor(name: string, value: string) {
    this.paramName = name;
    this.paramValue = value;
  }
}

export class filterParams {
  filterparams: filterparam[];

  constructor() {
    this.filterparams = [];
  }
}

export class selectstatement {
  selectstatement: string;

  constructor(selectstatement: string) {
    this.selectstatement = selectstatement;
  }
}


export class orderbystatement {
  ordergroupbystatement: string;

  constructor(orderbystatement: string) {
    this.ordergroupbystatement = orderbystatement;
  }
}
export class action {
  objecttype: string;
  roleid: string;
  rolename: string;
  actionname: string;
  actiondescription: string;
  isendpoint: boolean;

}

export class DataContract {
  personId: string
  apiService: any
  unload: Subject<any>
  moduleAction: Subject<any>;
  additionalInfo: [any]
}


