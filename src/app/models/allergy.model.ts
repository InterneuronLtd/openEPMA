//BEGIN LICENSE BLOCK 
//Interneuron Terminus

//Copyright(C) 2024  Interneuron Limited

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
export class Allergyintolerance {
    public allergyintolerance_id: string
    public person_id: string
    public encounter_id: string
    public causativeagentcodesystem: string
    public causativeagentcode: string
    public causativeagentdescription: string
    public clinicalstatusvalue: string
    public clinicalstatusby: string
    public cliinicialstatusdatetime: any
    public category: string
    public criticality: string
    public reportedbyname: string
    public reportedbydatetime: any
    public verificationstatus: string
    public assertedby: string
    public asserteddatetime: any
    public allergynotes: string
    public manifestationnotes: string
    public onsetdate: any
    public enddate: any
    public lastoccurencedate: any
    public recordedby: string
    public recordeddatetime: any
    public displaywarning: string
    public allergyconcept: string
    public reactionconcepts: string
    public reportedbygroup: string
    public reactiontext: string
}

export class Personwarningupdate {

    public epma_personwarningupdate_id: string
    public person_id: string
    public encounter_id: String
    public weight: number
    public height: number
    public bsa: number
    public allergens: any
    public warningcontextid: string
    public conditions:any
}
