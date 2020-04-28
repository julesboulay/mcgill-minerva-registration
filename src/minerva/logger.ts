import fs from "fs";
import { PDF, PDFinfo } from "./types";
import { timenow } from "./util";

const makeDir = (dirPath: string) =>
  new Promise<void>((resolve, reject) =>
    fs.exists(dirPath, (exits) => {
      if (exits) return resolve();

      fs.mkdir(dirPath, (error) => {
        if (error) return reject(error);
        resolve();
      });
    })
  );

const deleteFilesInDir = (dirPath: string): Promise<void> => {
  const unlink = (file: string) =>
    new Promise<void>((resolve, reject) =>
      fs.unlink(`${dirPath}/${file}`, (error) => {
        if (error) return reject(error);
        resolve();
      })
    );

  return new Promise<void>((resolve, reject) =>
    fs.readdir(dirPath, async (error, files) => {
      if (error) return reject(error);

      let promises: Promise<void>[] = [];
      for (const file of files) promises.push(unlink(file));

      await Promise.all(promises);
      resolve();
    })
  );
};

const readFile = (filepath: string): Promise<PDFinfo> =>
  new Promise<PDFinfo>((resolve, reject) =>
    fs.readFile(filepath, (error, data) => {
      if (error) return reject(error);
      const info: PDFinfo = JSON.parse(data.toString());
      resolve(info);
    })
  );

const writeFile = (filepath: string, data: string): Promise<void> =>
  new Promise<void>((resolve, reject) =>
    fs.writeFile(filepath, data, (error) => {
      if (error) return reject(error);
      resolve();
    })
  );

class Logger {
  private jsonfilepath: string;

  constructor(private dirPath: string) {
    this.jsonfilepath = `${this.dirPath}/log.json`;
  }

  /**
   * Creates PDFs directory, cleans it if exists already, and inits
   * the PDF info file.
   */
  public async init(): Promise<void> {
    await makeDir(this.dirPath);
    await deleteFilesInDir(this.dirPath);

    const content: PDFinfo = {
      errors: [],
      registrations: [],
    };
    const data = JSON.stringify(content, undefined, 4);
    await writeFile(this.jsonfilepath, data);
  }

  /**
   * Save the html of page at error in html file.
   * @param count
   * @param html
   */
  public async saveHTML(filepath: string, html: string): Promise<void> {
    await writeFile(filepath, html);
  }

  /**
   * Save new PDF info in json.
   * @param ftype
   * @param count
   * @param content
   */
  public async saveState(
    ftype: PDF,
    count: number,
    content: string
  ): Promise<void> {
    const info: PDFinfo = await readFile(this.jsonfilepath);

    switch (ftype) {
      case "error":
        info.errors.push({
          filename: `${this.dirPath}/error${count}.pdf`,
          timestamp: timenow(),
          stack: content,
        });
        const errordata = JSON.stringify(info, undefined, 4);
        await writeFile(this.jsonfilepath, errordata);
        break;

      case "success":
        info.registrations.push({
          filename: `${this.dirPath}/error${count}.pdf`,
          timestamp: timenow(),
          crn: content,
        });
        const successdata = JSON.stringify(info, undefined, 4);
        await writeFile(this.jsonfilepath, successdata);

      default:
    }
  }
}

export default Logger;
