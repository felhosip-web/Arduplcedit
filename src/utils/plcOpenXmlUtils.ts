import { Builder } from 'xml2js';
import { ProjectData, Rung, LadderElement, PLCVariable } from '../types';

/**
 * Very basic subset mapping for PLCopen XML standard.
 * The PLCopen TC6 XML standard is highly complex and verbose,
 * this function creates a simplified representation of variables and rungs
 * to demonstrate export capabilities.
 */
export function exportToPlcOpenXml(project: ProjectData): string {
  const builder = new Builder({ rootName: 'project', xmldec: { version: '1.0', encoding: 'UTF-8' } });

  const variables = project.variables?.map((v: PLCVariable) => ({
    $: { name: v.name },
    type: { [v.type === 'bool' ? 'BOOL' : v.type === 'float' ? 'REAL' : 'INT']: {} },
    initialValue: { simpleValue: { $: { value: String(v.initialValue) } } }
  })) || [];

  const convertElement = (el: LadderElement) => {
    let typeTag = 'contact';
    if (el.category === 'coil') typeTag = 'coil';

    return {
      $: { localId: el.id, type: el.type, name: el.name },
      variable: el.variable || '',
      position: { x: 0, y: 0 } // Positions are abstracted in our grid
    };
  };

  const convertRung = (rung: Rung) => {
    return {
      $: { localId: rung.id, name: `Rung_${rung.number}` },
      comment: rung.comment || '',
      branches: rung.branches.map(b => ({
        $: { localId: b.id },
        elements: b.elements.map(convertElement)
      })),
      coils: rung.coils.map(convertElement)
    };
  };

  const plcOpenObj = {
    $: { xmlns: "http://www.plcopen.org/xml/tc6_0201" },
    fileHeader: {
      $: { companyName: "Arduino PLC Ladder Studio", productName: "Web Editor", productVersion: project.version }
    },
    contentHeader: {
      $: { name: project.name || "PLC_Project", modificationDateTime: new Date().toISOString() }
    },
    instances: {
      configurations: {
        configuration: {
          $: { name: "Config0" },
          resource: {
            $: { name: "Res0" },
            task: {
              $: { name: "MainTask", interval: "PT0.020S", priority: "1" },
              pouInstance: { $: { name: "MainProgram", typeName: "Program0" } }
            }
          }
        }
      }
    },
    types: {
      dataTypes: {},
      pous: {
        pou: {
          $: { name: "Program0", pouType: "program" },
          interface: {
            localVars: { variable: variables }
          },
          body: {
            LD: {
              rungs: project.rungs?.map(convertRung) || []
            }
          }
        }
      }
    }
  };

  return builder.buildObject(plcOpenObj);
}
