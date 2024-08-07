//BEGIN LICENSE BLOCK 
//Interneuron Terminus

//Copyright(C) 2024  Interneuron Holdings Ltd

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

export class CoreResult {
    public result_id: string;
	public person_id: string;
	public encounter_id: string;
	public setid: number;
	public units: string;
	public value: string;
	public referencerange: string;
	public analysisdatetime: Date;
	public identifiercode: string;
	public identifiertext: string;
	public abnormalflag: string;
	public order_id: string;
	public observationdatetime: Date;
	public observationidentifiercode: string;
	public observationidentifiercodingsystem: string;
	public observationidentifiertext: string;
	public observationnotes: string;
	public observationresultstatus: string;
	public observationsubid: string;
	public observationvalue: string;
	public observationvaluenumeric: number;
	public referencerangehigh: string;
	public referencerangelow: string;
	public unitscode: string;
	public unitstext: string;
	public valuetype: string;
	public author: string;
	public creationdatetime: Date;
	public healthcarefacilitycode: string;
	public healthcarefacilitytext: string;
	public signedby: string;
	public reporttitle: string;
	public reporttypecode: string;
	public reporttypetext: string;
	public reportstatuscode: string;
	public reportstatustext: string;
	public reportexaminationdate: Date;
	public scantype: string;
	public resultnote: string;
}