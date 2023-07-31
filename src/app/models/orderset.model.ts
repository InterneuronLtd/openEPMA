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
export class OrderSet {
    prescriptionorderset_id: string;
    prescriptionordersettype_id: string;
    //orderSetType: string;
    addToNewOrderSet: boolean;
    newOrderSetName: string;
    addToExistingOrderSet: boolean;
    existingOrderSetName: string;
    definedCriteria: string;
    inclusiveValue: number;
    exclusiveValue: number;
    patient_id: string;
    owner: string;
}