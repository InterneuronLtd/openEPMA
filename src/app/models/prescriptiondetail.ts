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
export class prescriptiondetail {
    public prescription_id: string;
    public prescriptionconexttype_id: string;
    public indication: string;
    public comments: string;
    public heparin: number;
    public heparinunit: string;
    public additionalconditions: string;
    public reminderdays: number;
    public remindernotes: string;
    public titration: boolean;
    public titrationtype: string;
    public targetinr: number;
    public targetsaturation: number;
    public oxygendevices_id: string;
    public dosecalculations: string;
    public orderformtype: string;
    public isinfusion: boolean;
    public infusiontype: string;
    public isMedicinalGas:boolean;
    public prescriptionsource_id: string;
    public reasonforediting: string;
    public lastmodifiedby: string;
    public prescriptionevent_id: string;
    public status: string;
    public reasonforstopping: string;
    public reasonforsuspending: string
    public allowSubstitution: boolean
    public substitutioncomments: string;
    public packages: number;

    public medication_id: string;
	public name: string;
	public genericname: string;
	public medicationtype: string;
	public displayname: string;
	public form: string;
	public formcode: string;
	public strengthneumerator: number;
	public strengthdenominator: number;
	public strengthneumeratorunit: string;
	public strengthdenominatorunit: string;
	public doseformunits: string;
	public doseformsize: number;
	public doseformunitofmeasure: string;
	public bnf: string;
	public defineddailydose: string;
	public doseform: string;
	public doseperweight: string;
	public doseperweightunit: string;
	public roundingfactor: number;
	public actgroupcode: string;
	public actgroupname: string;
	public maxdoseperdayunit: string;
	public maxdoseperday: number;
	public maxdoseperweek: number;
	public maxdoseperweekunit: string;
	public producttype: string;
	public isformulary: boolean;
	public isblacktriangle: boolean;
	public iscontrolled: boolean;
	public iscritical: boolean;
	public markedmodifier: string;
	public modifiedreleasehrs: number;
	public reviewreminderdays: number;
	public isprimary: boolean;
}